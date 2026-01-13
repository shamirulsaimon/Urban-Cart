from decimal import Decimal
from io import BytesIO

from django.db import transaction
from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from cart.models import CartItem
from catalog.models import Product
from .models import Order, OrderItem, OrderStatusHistory
from .serializers import CheckoutSerializer, OrderDetailSerializer


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

        # Lock products to prevent overselling
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

        order = Order.objects.create(
            user=request.user,
            status=Order.Status.PENDING,
            payment_method=data["payment_method"],
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
                )
            )
            p.stock = F("stock") - ci.qty
            p.save(update_fields=["stock"])

        OrderItem.objects.bulk_create(bulk_items)
        cart_items.delete()

        return Response(
            OrderDetailSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


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
class MyOrderInvoiceView(APIView):
    """
    GET /api/orders/my/<id>/invoice/
    Only the owner of the order can download the invoice.
    """
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
        filename = f'invoice-{order.order_number}.pdf'

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp
