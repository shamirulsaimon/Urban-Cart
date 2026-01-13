from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status

from orders.models import Order
from .models import Payment
from .serializers import PaymentSerializer, InitiatePaymentSerializer
from .sslcommerz import create_sslcommerz_session, SSLCommerzError


def _get_my_order(user, order_id: int):
    return Order.objects.get(id=order_id, user=user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    ser = InitiatePaymentSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    order_id = ser.validated_data["orderId"]
    method = ser.validated_data["method"]  # "cod" or "sslcommerz"

    try:
        order = _get_my_order(request.user, order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    # ✅ If already paid, don't re-initiate
    if order.payment_status == Order.PaymentStatus.PAID:
        payment = Payment.objects.filter(order=order).first()
        return Response(
            {
                "ok": True,
                "already_paid": True,
                "method": order.payment_method,
                "payment": PaymentSerializer(payment).data if payment else None,
            }
        )

    # Always sync order payment method
    if order.payment_method != method:
        order.payment_method = method
        order.save(update_fields=["payment_method", "updated_at"])

    payment, _ = Payment.objects.get_or_create(
        order=order,
        defaults={
            "user": request.user,
            "method": method,
            "amount": order.total,
            "status": "initiated",
        },
    )

    # ✅ Keep payment record consistent
    changed = False

    if payment.user_id != request.user.id:
        payment.user = request.user
        changed = True

    if payment.method != method:
        payment.method = method
        payment.status = "initiated"
        changed = True

    if str(payment.amount) != str(order.total):
        payment.amount = order.total
        changed = True

    if payment.status == "paid":
        return Response({"ok": True, "already_paid": True, "payment": PaymentSerializer(payment).data})

    if changed:
        payment.save(update_fields=["user", "method", "status", "amount", "updated_at"])

    # COD: keep unpaid; payment row becomes pending
    if method == "cod":
        if payment.status != "pending":
            payment.status = "pending"
            payment.save(update_fields=["status", "updated_at"])
        return Response({"ok": True, "method": "cod", "payment": PaymentSerializer(payment).data})

    # ✅ DEMO MODE: return your frontend demo page as "gateway_url"
    if getattr(settings, "PAYMENTS_DEMO_MODE", False):
        payment.status = "pending"
        payment.transaction_id = payment.transaction_id or f"DEMO-{order.id}"
        payment.save(update_fields=["status", "transaction_id", "updated_at"])

        demo_gateway_url = f"http://localhost:5173/payment/demo?orderId={order.id}"
        return Response(
            {
                "ok": True,
                "method": "sslcommerz",
                "gateway_url": demo_gateway_url,
                "demo": True,
                "payment": PaymentSerializer(payment).data,
            }
        )

    # REAL SSLCommerz (only works with real credentials)
    try:
        result = create_sslcommerz_session(
            store_id=settings.SSLCOMMERZ_STORE_ID,
            store_passwd=settings.SSLCOMMERZ_STORE_PASS,
            base_url=settings.SSLCOMMERZ_BASE_URL,
            order_id=order.id,
            amount=str(order.total),
            currency=getattr(settings, "SSLCOMMERZ_CURRENCY", "BDT"),
            customer_name=order.shipping_name,
            customer_email=getattr(request.user, "email", "") or "",
            customer_phone=order.phone,
            success_url=settings.SSLCOMMERZ_SUCCESS_URL,
            fail_url=settings.SSLCOMMERZ_FAIL_URL,
            cancel_url=settings.SSLCOMMERZ_CANCEL_URL,
            ipn_url=settings.SSLCOMMERZ_IPN_URL,
            ship_name=order.shipping_name,
            ship_add1=order.address,
            ship_city=order.city,
            ship_country="Bangladesh",
            ship_postcode="1200",
            cus_postcode="1200",
        )
    except SSLCommerzError as e:
        payment.status = "failed"
        payment.save(update_fields=["status", "updated_at"])
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    payment.status = "pending"
    payment.transaction_id = result["tran_id"]
    payment.gateway_session_key = result["sessionkey"]
    payment.save(update_fields=["status", "transaction_id", "gateway_session_key", "updated_at"])

    return Response(
        {
            "ok": True,
            "method": "sslcommerz",
            "gateway_url": result["gateway_url"],
            "payment": PaymentSerializer(payment).data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def sslcommerz_ipn(request):
    payload = request.data if hasattr(request, "data") else {}
    tran_id = (
        payload.get("tran_id")
        or payload.get("tranId")
        or payload.get("tranid")
        or payload.get("tranID")
    )
    posted_status = (payload.get("status") or "").upper()

    if not tran_id:
        return Response({"detail": "Missing tran_id"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = Payment.objects.select_related("order").get(transaction_id=tran_id)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

    payment.raw_ipn = payload

    if posted_status == "VALID":
        payment.status = "paid"
        payment.save(update_fields=["status", "raw_ipn", "updated_at"])

        order = payment.order
        if order.payment_method != "sslcommerz":
            order.payment_method = "sslcommerz"
        if order.payment_status != Order.PaymentStatus.PAID:
            order.payment_status = Order.PaymentStatus.PAID
        order.save(update_fields=["payment_method", "payment_status", "updated_at"])

        return Response({"ok": True})

    if posted_status == "CANCELLED":
        payment.status = "cancelled"
        payment.save(update_fields=["status", "raw_ipn", "updated_at"])
        return Response({"ok": True})

    payment.status = "failed"
    payment.save(update_fields=["status", "raw_ipn", "updated_at"])
    return Response({"ok": True})


# ✅ DEMO endpoints (frontend calls these)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def demo_confirm(request):
    order_id = request.data.get("orderId")
    if not order_id:
        return Response({"detail": "orderId is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = _get_my_order(request.user, int(order_id))
    except (Order.DoesNotExist, ValueError):
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    payment, _ = Payment.objects.get_or_create(
        order=order,
        defaults={
            "user": request.user,
            "method": "sslcommerz",
            "amount": order.total,
            "status": "paid",
            "transaction_id": f"DEMO-{order.id}",
        },
    )

    # Update payment record
    payment.user = request.user
    payment.method = "sslcommerz"
    payment.amount = order.total
    payment.status = "paid"
    if not payment.transaction_id:
        payment.transaction_id = f"DEMO-{order.id}"
    payment.save(update_fields=["user", "method", "amount", "status", "transaction_id", "updated_at"])

    # Update order
    order.payment_method = "sslcommerz"
    order.payment_status = Order.PaymentStatus.PAID
    order.save(update_fields=["payment_method", "payment_status", "updated_at"])

    return Response({"ok": True, "orderId": order.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def demo_fail(request):
    order_id = request.data.get("orderId")
    if not order_id:
        return Response({"detail": "orderId is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = _get_my_order(request.user, int(order_id))
    except (Order.DoesNotExist, ValueError):
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    payment = Payment.objects.filter(order=order).first()
    if payment:
        payment.status = "failed"
        payment.save(update_fields=["status", "updated_at"])

    return Response({"ok": True, "orderId": order.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def demo_cancel(request):
    order_id = request.data.get("orderId")
    if not order_id:
        return Response({"detail": "orderId is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = _get_my_order(request.user, int(order_id))
    except (Order.DoesNotExist, ValueError):
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    payment = Payment.objects.filter(order=order).first()
    if payment:
        payment.status = "cancelled"
        payment.save(update_fields=["status", "updated_at"])

    return Response({"ok": True, "orderId": order.id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_payments(request):
    qs = Payment.objects.filter(user=request.user).order_by("-id")
    return Response(PaymentSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_payments(request):
    qs = Payment.objects.select_related("order", "user").order_by("-id")[:500]
    return Response(PaymentSerializer(qs, many=True).data)
