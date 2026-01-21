import io
from datetime import timedelta
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Value, DecimalField, Count
from django.db.models.functions import Coalesce, TruncMonth

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsVendorRole
from .models import OrderItem


DECIMAL_0 = Value(Decimal("0.00"), output_field=DecimalField(max_digits=12, decimal_places=2))


def _as_xlsx_bytes(rows, headers, sheet_name="Report"):
  """
  Creates XLSX in-memory using openpyxl (already installed in your environment).
  """
  from openpyxl import Workbook
  wb = Workbook()
  ws = wb.active
  ws.title = sheet_name[:31]

  ws.append(headers)
  for r in rows:
    ws.append(r)

  # basic column width
  for col in ws.columns:
    max_len = 0
    col_letter = col[0].column_letter
    for cell in col:
      try:
        max_len = max(max_len, len(str(cell.value or "")))
      except Exception:
        pass
    ws.column_dimensions[col_letter].width = min(40, max(12, max_len + 2))

  buf = io.BytesIO()
  wb.save(buf)
  return buf.getvalue()


class VendorSalesReportOverallXlsx(APIView):
  permission_classes = [IsAuthenticated, IsVendorRole]

  def get(self, request):
    vendor = request.user

    qs = (
      OrderItem.objects
      .filter(product__vendor=vendor)
      .select_related("order", "product")
      .order_by("-order__created_at")
    )

    rows = []
    for it in qs:
      rows.append([
        it.order.order_number,
        it.order.created_at.strftime("%Y-%m-%d %H:%M"),
        it.product.id,
        it.product.name,
        int(it.quantity),
        float(it.price),
        float(it.line_total),
        it.order.status,
        it.order.payment_method,
        it.order.payment_status,
      ])

    headers = [
      "Order #", "Date", "Product ID", "Product",
      "Qty", "Unit Price", "Line Total",
      "Order Status", "Payment Method", "Payment Status"
    ]

    content = _as_xlsx_bytes(rows, headers, sheet_name="Overall Sales")
    filename = "vendor_sales_overall.xlsx"

    resp = HttpResponse(
      content,
      content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


class VendorSalesReportMonthlyXlsx(APIView):
  permission_classes = [IsAuthenticated, IsVendorRole]

  def get(self, request):
    vendor = request.user

    now = timezone.now()
    start = (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=365))

    monthly = (
      OrderItem.objects
      .filter(product__vendor=vendor, order__created_at__gte=start)
      .annotate(month=TruncMonth("order__created_at"))
      .values("month")
      .annotate(
        revenue=Coalesce(Sum("line_total"), DECIMAL_0, output_field=DecimalField(max_digits=12, decimal_places=2)),
        units=Coalesce(Sum("quantity"), Value(0)),
        orders=Count("order_id", distinct=True),
      )
      .order_by("month")
    )

    rows = []
    for r in monthly:
      rows.append([
        r["month"].strftime("%Y-%m") if r["month"] else "",
        int(r["orders"] or 0),
        int(r["units"] or 0),
        float(r["revenue"] or 0),
      ])

    headers = ["Month", "Orders", "Units Sold", "Revenue"]
    content = _as_xlsx_bytes(rows, headers, sheet_name="Monthly Sales")
    filename = "vendor_sales_monthly.xlsx"

    resp = HttpResponse(
      content,
      content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp
