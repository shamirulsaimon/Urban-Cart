from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import (
    Count,
    Q,
    Sum,
    Value,
    DecimalField,
    F,
    ExpressionWrapper,
)
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsVendorRole
from .models import Order, OrderItem


DECIMAL_0 = Value(Decimal("0.00"), output_field=DecimalField(max_digits=12, decimal_places=2))


def _abs_media_url(request, stored_path):
    if not stored_path:
        return None
    s = str(stored_path)

    if s.startswith("http://") or s.startswith("https://"):
        return s

    if s.startswith("/"):
        return request.build_absolute_uri(s)

    media = (settings.MEDIA_URL or "/media/").rstrip("/") + "/"
    rel = media + s.lstrip("/")
    if not rel.startswith("/"):
        rel = "/" + rel
    return request.build_absolute_uri(rel)


class VendorDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user

        # ---------- Active products (vendor-only) ----------
        try:
            from catalog.models import Product
            products_count = Product.objects.filter(vendor=vendor, is_active=True).count()
        except Exception:
            products_count = 0

        # ---------- Orders containing vendor items (multi-vendor safe) ----------
        vendor_order_qs = (
            Order.objects.annotate(
                vendor_items=Count(
                    "items",
                    filter=Q(items__product__vendor=vendor),
                    distinct=True
                )
            )
            .filter(vendor_items__gt=0)
        )

        total_orders = vendor_order_qs.count()

        by_status_rows = vendor_order_qs.values("status").annotate(c=Count("id"))
        by_status = {row["status"]: row["c"] for row in by_status_rows}

        # ---------- Revenue expression (works even if line_total not set) ----------
        revenue_expr = ExpressionWrapper(
            F("quantity") * F("price"),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )

        # ---------- Revenue total (vendor-only) ----------
        revenue_total = (
            OrderItem.objects
            .filter(product__vendor=vendor)
            .aggregate(
                total=Coalesce(
                    Sum(revenue_expr),
                    DECIMAL_0,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )
            .get("total")
        )

        # ---------- Monthly sales (ALWAYS last 12 months, fill missing months with 0) ----------
        now = timezone.now()
        end_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # list of last 12 months as YYYY-MM
        months = []
        cur = end_month
        for _ in range(12):
            months.append(cur.strftime("%Y-%m"))
            if cur.month == 1:
                cur = cur.replace(year=cur.year - 1, month=12)
            else:
                cur = cur.replace(month=cur.month - 1)
        months = list(reversed(months))  # oldest -> newest

        # start month = 11 months before end_month
        cur = end_month
        for _ in range(11):
            if cur.month == 1:
                cur = cur.replace(year=cur.year - 1, month=12)
            else:
                cur = cur.replace(month=cur.month - 1)
        start = cur

        monthly_rows = (
            OrderItem.objects
            .filter(product__vendor=vendor, order__created_at__gte=start)
            .annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(
                revenue=Coalesce(
                    Sum(revenue_expr),
                    DECIMAL_0,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                orders=Count("order_id", distinct=True),
            )
            .order_by("month")
        )

        row_map = {}
        for r in monthly_rows:
            k = r["month"].strftime("%Y-%m") if r["month"] else ""
            row_map[k] = {
                "revenue": float(r["revenue"] or 0),
                "orders": int(r["orders"] or 0),
            }

        monthly_sales = []
        for k in months:
            v = row_map.get(k, {"revenue": 0.0, "orders": 0})
            monthly_sales.append({"month": k, "revenue": v["revenue"], "orders": v["orders"]})

        # ---------- Top-selling products ----------
        top_rows = (
            OrderItem.objects
            .filter(product__vendor=vendor)
            .values("product_id", "product__name")
            .annotate(
                units=Coalesce(Sum("quantity"), Value(0)),
                revenue=Coalesce(
                    Sum(revenue_expr),
                    DECIMAL_0,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
            )
            .order_by("-units", "-revenue")[:8]
        )

        # attach first image per product (absolute URL)
        image_map = {}
        try:
            from catalog.models import ProductImage
            img_rows = (
                ProductImage.objects
                .filter(product_id__in=[r["product_id"] for r in top_rows])
                .values("product_id", "image")
            )
            for r in img_rows:
                pid = r["product_id"]
                if pid not in image_map:
                    image_map[pid] = r["image"]
        except Exception:
            pass

        top_products = []
        for r in top_rows:
            pid = r["product_id"]
            stored_img_path = image_map.get(pid)
            top_products.append({
                "product_id": pid,
                "name": r["product__name"],
                "units": int(r["units"] or 0),
                "revenue": float(r["revenue"] or 0),
                "image": _abs_media_url(request, stored_img_path),
            })

        return Response({
            "products": products_count,
            "totalOrders": total_orders,
            "byStatus": by_status,
            "revenueTotal": float(revenue_total or 0),
            "monthlySales": monthly_sales,
            "topProducts": top_products,
        })
