from decimal import Decimal
from io import BytesIO
import random
from datetime import timedelta
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from cart.models import CartItem
from catalog.models import Product
from .models import Order, OrderItem, OrderStatusHistory
from .serializers import CheckoutSerializer, OrderDetailSerializer
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.authentication import JWTAuthentication

class QueryParamJWTAuthentication(JWTAuthentication):
    """
    Allows JWT token via ?token=... for download endpoints opened in a new tab.
    Keeps normal Authorization header behavior unchanged.
    """
    def authenticate(self, request):
        # If Authorization header already present, use normal behavior
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        # Otherwise, accept token from query param for this request
        token = request.query_params.get("token")
        if token:
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"
            return super().authenticate(request)

        return None

# -------------------------
# PDF Invoice helpers (NEW)
# -------------------------
def _money(val):
    try:
        return f"{Decimal(val):,.2f}"
    except Exception:
        try:
            return f"{Decimal(str(val)):,.2f}"
        except Exception:
            return "0.00"


def build_invoice_pdf(order: Order) -> bytes:
    """
    Generates a clean PDF invoice for an Order and returns raw PDF bytes.
    Fixes long product names overflowing into next column by wrapping text.
    """
    from xml.sax.saxutils import escape  # safe HTML escape for Paragraph

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"Invoice {order.order_number}",
        author="Urban Cart",
    )

    styles = getSampleStyleSheet()

    # ✅ Wrap style for long product names
    item_name_style = ParagraphStyle(
        "ItemName",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        wordWrap="CJK",   # ✅ strong wrapping behavior
    )

    story = []

    # Header
    story.append(Paragraph("<b>Urban Cart</b>", styles["Title"]))
    story.append(Paragraph(f"<b>Invoice:</b> {order.order_number}", styles["BodyText"]))
    story.append(Spacer(1, 10))

    # Order meta
    meta_lines = [
        f"<b>Order ID:</b> {order.id}",
        f"<b>Date:</b> {order.created_at.strftime('%Y-%m-%d %H:%M') if getattr(order, 'created_at', None) else ''}",
        f"<b>Status:</b> {order.status}",
        f"<b>Payment:</b> {order.payment_method} ({order.payment_status})",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, styles["BodyText"]))
    story.append(Spacer(1, 12))

    # Shipping / Customer info
    story.append(Paragraph("<b>Shipping Details</b>", styles["Heading3"]))
    ship_lines = [
        f"<b>Name:</b> {order.shipping_name}",
        f"<b>Phone:</b> {order.phone}",
        f"<b>City:</b> {order.city}",
        f"<b>Address:</b> {order.address}",
    ]
    if order.note:
        ship_lines.append(f"<b>Note:</b> {order.note}")

    for line in ship_lines:
        story.append(Paragraph(line, styles["BodyText"]))
    story.append(Spacer(1, 14))

    # Items table
    story.append(Paragraph("<b>Items</b>", styles["Heading3"]))
    data = [["#", "Product", "SKU", "Qty", "Unit Price", "Line Total"]]

    for idx, it in enumerate(order.items.all(), start=1):
        # ✅ Wrap product name safely
        pname_raw = (
            getattr(it, "product_title", None)
            or getattr(it, "name", None)
            or getattr(getattr(it, "product", None), "name", None)
            or getattr(getattr(it, "product", None), "title", None)
            or "Item"
        )
        pname = Paragraph(escape(str(pname_raw)), item_name_style)

        sku_raw = getattr(it, "sku", None) or getattr(getattr(it, "product", None), "sku", None) or ""
        sku = str(sku_raw)

        data.append([
            str(idx),
            pname,                 # ✅ Paragraph instead of string (wraps)
            sku,
            str(it.quantity),
            _money(it.price),
            _money(it.line_total),
        ])

    # ✅ Keep fixed widths; wrapping happens inside Product column
    table = Table(data, colWidths=[24, 220, 90, 40, 80, 80])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),

        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),

        # ✅ TOP alignment looks best when product wraps into multiple lines
        ("VALIGN", (0, 0), (-1, -1), "TOP"),

        # ✅ Extra padding so wrapped lines look clean
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 14))

    # Totals table
    totals = [
        ["Subtotal", _money(order.subtotal)],
        ["Discount", f"-{_money(order.discount_total)}"],
        ["Shipping", _money(order.shipping_fee)],
        ["Total", _money(order.total)],
    ]
    totals_table = Table(totals, colWidths=[120, 120])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -2), 10),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("BACKGROUND", (0, -1), (-1, -1), colors.whitesmoke),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(totals_table)

    doc.build(story)
    pdf = buf.getvalue()
    buf.close()
    return pdf

    """
    Generates a clean PDF invoice for an Order and returns raw PDF bytes.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"Invoice {order.order_number}",
        author="Urban Cart",
    )

    styles = getSampleStyleSheet()
    story = []

    # Header
    story.append(Paragraph("<b>Urban Cart</b>", styles["Title"]))
    story.append(Paragraph("Invoice", styles["Heading2"]))
    story.append(Spacer(1, 10))

    # Meta block
    created = order.created_at.astimezone(timezone.get_current_timezone()).strftime("%Y-%m-%d %H:%M")
    meta_lines = [
        f"<b>Invoice for:</b> {order.order_number}",
        f"<b>Order ID:</b> {order.id}",
        f"<b>Order Date:</b> {created}",
        f"<b>Status:</b> {order.status}",
        f"<b>Payment:</b> {order.payment_method} ({order.payment_status})",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, styles["BodyText"]))
    story.append(Spacer(1, 12))

    # Shipping / Customer info
    story.append(Paragraph("<b>Shipping Details</b>", styles["Heading3"]))
    ship_lines = [
        f"<b>Name:</b> {order.shipping_name}",
        f"<b>Phone:</b> {order.phone}",
        f"<b>City:</b> {order.city}",
        f"<b>Address:</b> {order.address}",
    ]
    if order.note:
        ship_lines.append(f"<b>Note:</b> {order.note}")
    for line in ship_lines:
        story.append(Paragraph(line, styles["BodyText"]))
    story.append(Spacer(1, 14))

    # Items table
    story.append(Paragraph("<b>Items</b>", styles["Heading3"]))

    data = [["#", "Product", "SKU", "Qty", "Unit Price", "Line Total"]]
    items = list(order.items.all())
    for idx, it in enumerate(items, start=1):
        data.append([
            str(idx),
            (it.name or ""),
            (it.sku or ""),
            str(it.quantity),
            _money(it.price),
            _money(it.line_total),
        ])

    table = Table(data, colWidths=[24, 220, 90, 40, 80, 80])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),

        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(table)
    story.append(Spacer(1, 14))

    # Totals table
    totals = [
        ["Subtotal", _money(order.subtotal)],
        ["Discount", f"-{_money(order.discount_total)}"],
        ["Shipping", _money(order.shipping_fee)],
        ["Total", _money(order.total)],
    ]
    totals_table = Table(totals, colWidths=[120, 120])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -2), 10),

        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),

        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.black),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 16))

    # Footer
    story.append(Paragraph("Thank you for shopping with Urban Cart.", styles["Italic"]))

    doc.build(story)
    pdf = buf.getvalue()
    buf.close()
    return pdf


# -------------------------
# Demo OTP Email Template (NEW)
# -------------------------
def _send_demo_otp_email(*, order: Order, user, otp: str, channel: str, expires_minutes: int = 3) -> None:
    """
    Sends a nicer looking HTML OTP email + plain text fallback.
    Keeps architecture: still uses Django email backend.
    """
    user_email = (getattr(user, "email", "") or "").strip()
    if not user_email:
        raise ValueError("User has no email.")

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@urbancart.local"
    subject = f"Urban Cart OTP (Demo Payment) • {order.order_number}"

    display_name = (
        getattr(user, "get_full_name", lambda: "")() or
        getattr(user, "username", "") or
        "Customer"
    )
    channel_label = (channel or "sslcommerz").upper()
    amount = _money(order.total)

    html = f"""
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#111827;color:#ffffff;padding:18px 22px;">
          <div style="font-size:18px;font-weight:700;line-height:1.2;">Urban Cart</div>
          <div style="font-size:13px;opacity:.9;margin-top:2px;">Demo Payment Verification</div>
        </div>

        <div style="padding:22px;color:#111827;">
          <p style="margin:0 0 12px;font-size:14px;">Hi <b>{display_name}</b>,</p>
          <p style="margin:0 0 14px;font-size:14px;">
            Use the OTP below to confirm your <b>{channel_label}</b> demo payment.
          </p>

          <div style="text-align:center;margin:14px 0 10px;">
            <div style="display:inline-block;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:12px;
                        padding:14px 18px;font-size:32px;font-weight:800;letter-spacing:6px;">
              {otp}
            </div>
          </div>

          <div style="border-top:1px solid #eef2f7;margin-top:16px;padding-top:14px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;">Order</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">{order.order_number}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;">Amount</td>
                <td style="padding:6px 0;text-align:right;font-weight:700;">৳ {amount}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;">OTP Expiry</td>
                <td style="padding:6px 0;text-align:right;">{expires_minutes} minutes</td>
              </tr>
            </table>
          </div>

          <p style="margin:14px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">
            ⚠ This is a demo feature for academic project show only. No real transaction is performed.
            If you didn’t request this OTP, you can ignore this email.
          </p>
        </div>

        <div style="background:#f9fafb;border-top:1px solid #eef2f7;padding:12px 22px;color:#6b7280;font-size:12px;">
          Urban Cart • Demo Payment System
        </div>
      </div>
    </div>
    """.strip()

    text = strip_tags(html).replace("\n\n", "\n").strip()
    msg = EmailMultiAlternatives(subject=subject, body=text, from_email=from_email, to=[user_email])
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)


# -------------------------
# Customer: Checkout
# -------------------------
class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        ser = CheckoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        cart_items = (
            CartItem.objects.select_related("product", "cart").filter(cart__user=request.user)
        )

        if not cart_items.exists():
            return Response({"detail": "Your cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Lock products to prevent overselling (at least at checkout time)
        product_ids = list(cart_items.values_list("product_id", flat=True))
        products = (
            Product.objects.select_for_update().filter(id__in=product_ids, is_active=True)
        )
        product_map = {p.id: p for p in products}

        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        shipping_fee = Decimal("0.00")

        lines = []
        for ci in cart_items:
            p = product_map.get(ci.product_id)
            if not p:
                return Response(
                    {"detail": f"Product not available (id={ci.product_id})."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if ci.qty <= 0:
                return Response({"detail": "Invalid cart quantity."}, status=status.HTTP_400_BAD_REQUEST)

            if p.stock < ci.qty:
                return Response(
                    {"detail": f"Not enough stock for {p.name}. Available: {p.stock}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            price = Decimal(str(p.price))
            line_total = (price * Decimal(ci.qty)).quantize(Decimal("0.01"))
            subtotal += line_total

            lines.append((ci, p, price, line_total))

        total = (subtotal - discount_total + shipping_fee).quantize(Decimal("0.01"))

        payment_method = data["payment_method"]

        # Create order (always)
        order = Order.objects.create(
            user=request.user,
            status=Order.Status.PENDING,
            payment_method=payment_method,
            payment_status=Order.PaymentStatus.UNPAID,
            shipping_name=data["shipping_name"],
            phone=data["phone"],
            address=data["address"],
            city=data["city"],
            note=data.get("note", "") or "",
            subtotal=subtotal,
            discount_total=discount_total,
            shipping_fee=shipping_fee,
            total=total,
        )

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            changed_by=request.user,
            note="Order created",
        )

        # Create order items snapshot
        bulk_items = []
        for ci, p, price, line_total in lines:
            bulk_items.append(
                OrderItem(
                    order=order,
                    product=p,
                    name=p.name,
                    sku=getattr(p, "sku", "") or "",
                    price=price,
                    quantity=ci.qty,
                    line_total=line_total,
                    vendor=getattr(p, "vendor", None) if hasattr(p, "vendor") else None,
                )
            )
        OrderItem.objects.bulk_create(bulk_items)

        # ✅ COD: finalize immediately (reduce stock + clear cart)
        if payment_method != "sslcommerz":
            for ci, p, price, line_total in lines:
                p.stock = F("stock") - ci.qty
                p.save(update_fields=["stock"])
            cart_items.delete()

            order.status = Order.Status.CONFIRMED
            order.payment_status = Order.PaymentStatus.UNPAID  # COD unpaid until delivery
            order.save(update_fields=["status", "payment_status"])

            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                changed_by=request.user,
                note="Order confirmed (COD)",
            )

        # ✅ SSLCommerz demo: do NOT reduce stock, do NOT clear cart yet
        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# -------------------------
# DEMO Payment: Send OTP
# -------------------------
class DemoSendOtpView(APIView):
    """
    POST /api/orders/demo/send-otp/
    Body: { "order_id": <int>, "channel": "bkash"|"card", "phone": "01..." (optional) }
    Sends OTP to the logged-in user's email for demo payment confirmation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        channel = (request.data.get("channel") or "").strip().lower()
        phone = (request.data.get("phone") or "").strip()

        if not order_id:
            return Response({"detail": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if channel not in ["bkash", "card"]:
            return Response({"detail": "channel must be 'bkash' or 'card'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_method != "sslcommerz":
            return Response({"detail": "This demo OTP is only for sslcommerz orders."}, status=status.HTTP_400_BAD_REQUEST)

        if order.payment_status == Order.PaymentStatus.PAID:
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        # Small resend throttle (prevents spam)
        now = timezone.now()
        if order.demo_otp_created_at and (now - order.demo_otp_created_at) < timedelta(seconds=20):
            return Response({"detail": "Please wait a few seconds before requesting a new OTP."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate OTP
        otp = f"{random.randint(100000, 999999)}"

        order.demo_payment_channel = channel
        order.demo_payment_phone = phone if channel == "bkash" else ""
        order.demo_otp_code = otp
        order.demo_otp_created_at = now
        order.demo_otp_used = False
        order.save(update_fields=[
            "demo_payment_channel",
            "demo_payment_phone",
            "demo_otp_code",
            "demo_otp_created_at",
            "demo_otp_used",
        ])

        user_email = (getattr(request.user, "email", "") or "").strip()
        if not user_email:
            return Response(
                {"detail": "Your account has no email. Add an email and try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            _send_demo_otp_email(order=order, user=request.user, otp=otp, channel=channel, expires_minutes=3)
        except Exception:
            return Response({"detail": "Failed to send OTP email. Check SMTP settings."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"detail": "OTP sent to your email (demo)."}, status=status.HTTP_200_OK)


# -------------------------
# DEMO Payment: Verify OTP + Finalize
# -------------------------
class DemoVerifyOtpView(APIView):
    """
    POST /api/orders/demo/verify-otp/
    Body: { "order_id": <int>, "otp": "123456" }
    If valid: marks order PAID + CONFIRMED, reduces stock, clears cart.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        order_id = request.data.get("order_id")
        otp = (request.data.get("otp") or "").strip()

        if not order_id:
            return Response({"detail": "order_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not otp:
            return Response({"detail": "otp is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = (
                Order.objects.select_for_update()
                .prefetch_related("items")
                .get(id=order_id, user=request.user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_method != "sslcommerz":
            return Response({"detail": "This demo OTP is only for sslcommerz orders."}, status=status.HTTP_400_BAD_REQUEST)

        if order.payment_status == Order.PaymentStatus.PAID:
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        if order.demo_otp_used:
            return Response({"detail": "OTP already used. Please request a new OTP."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not order.demo_otp_code or not order.demo_otp_created_at:
            return Response({"detail": "No OTP requested. Please send OTP first."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Expiry: 3 minutes
        if timezone.now() > order.demo_otp_created_at + timedelta(minutes=3):
            return Response({"detail": "OTP expired. Please request a new OTP."},
                            status=status.HTTP_400_BAD_REQUEST)

        if otp != order.demo_otp_code:
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Finalize: reduce stock using order items
        item_list = list(order.items.all())
        product_ids = [it.product_id for it in item_list]
        products = Product.objects.select_for_update().filter(id__in=product_ids, is_active=True)
        product_map = {p.id: p for p in products}

        for it in item_list:
            p = product_map.get(it.product_id)
            if not p:
                return Response({"detail": f"Product not available (id={it.product_id})."},
                                status=status.HTTP_400_BAD_REQUEST)
            if p.stock < it.quantity:
                return Response({"detail": f"Not enough stock for {p.name}. Available: {p.stock}"},
                                status=status.HTTP_400_BAD_REQUEST)

        # Decrement after validation
        for it in item_list:
            p = product_map[it.product_id]
            p.stock = F("stock") - it.quantity
            p.save(update_fields=["stock"])

        # Clear cart now (payment succeeded)
        CartItem.objects.filter(cart__user=request.user).delete()

        # Mark order paid + confirmed
        order.payment_status = Order.PaymentStatus.PAID
        order.status = Order.Status.CONFIRMED
        order.demo_otp_used = True
        order.demo_paid_at = timezone.now()
        order.save(update_fields=[
            "payment_status", "status", "demo_otp_used", "demo_paid_at"
        ])

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            changed_by=request.user,
            note=f"Demo payment confirmed ({(order.demo_payment_channel or 'sslcommerz')})",
        )

        return Response(OrderDetailSerializer(order, context={"request": request}).data,
                        status=status.HTTP_200_OK)


# -------------------------
# Customer: My Orders
# -------------------------
class MyOrdersListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by("-created_at")


class MyOrderDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


# -------------------------
# Customer: Invoice Download (NEW)
# -------------------------
@method_decorator(csrf_exempt, name="dispatch")
class MyOrderInvoiceView(APIView):
    authentication_classes = [QueryParamJWTAuthentication]  # ✅ NEW
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            order = (
                Order.objects.select_related("user")
                .prefetch_related("items")
                .get(id=id, user=request.user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        pdf_bytes = build_invoice_pdf(order)
        filename = f"invoice-{order.order_number}.pdf"

        bio = BytesIO(pdf_bytes)
        resp = FileResponse(
            bio,
            content_type="application/pdf",
            as_attachment=True,
            filename=filename,
        )
        resp["Access-Control-Expose-Headers"] = "Content-Disposition"
        return resp
