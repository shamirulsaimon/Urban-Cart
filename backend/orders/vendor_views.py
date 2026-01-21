from datetime import timedelta

from django.db.models import Count, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsVendorRole
from .models import Order, OrderItem
from .serializers_vendor import VendorOrderSerializer, VendorOrderDetailSerializer

# ✅ Optional: If your project has OrderStatusHistory (it exists in serializers.py)
try:
    from .models import OrderStatusHistory
except Exception:
    OrderStatusHistory = None


class VendorOrdersList(APIView):
    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user

        qs = (
            Order.objects
            .annotate(
                vendor_items=Count(
                    "items",
                    filter=Q(items__product__vendor=vendor),
                    distinct=True
                ),
            )
            .filter(vendor_items__gt=0)
            .order_by("-id")
            .prefetch_related("items__product")
        )

        data = VendorOrderSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class VendorOrderDetail(APIView):
    permission_classes = [IsAuthenticated, IsVendorRole]

    def _get_vendor_order(self, vendor, pk):
        return (
            Order.objects
            .annotate(
                vendor_items=Count(
                    "items",
                    filter=Q(items__product__vendor=vendor),
                    distinct=True
                ),
            )
            .filter(id=pk, vendor_items__gt=0)
            .prefetch_related("items__product")
            .first()
        )

    def get(self, request, pk):
        vendor = request.user
        order = self._get_vendor_order(vendor, pk)

        if not order:
            return Response({"detail": "Not found."}, status=404)

        data = VendorOrderDetailSerializer(order, context={"request": request}).data
        return Response(data)

    # ✅ FIX: allow PATCH for vendor status update
    def patch(self, request, pk):
        vendor = request.user
        order = self._get_vendor_order(vendor, pk)

        if not order:
            return Response({"detail": "Not found."}, status=404)

        next_status = (request.data.get("status") or "").strip().lower()
        note = (request.data.get("note") or "").strip()

        if not next_status:
            return Response({"detail": "Status is required."}, status=400)

        # Optional policy: require note for cancelled/refunded (matches frontend)
        if next_status in ("cancelled", "refunded") and not note:
            return Response({"detail": "Note is required for cancelled/refunded."}, status=400)

        # If your Order model has choices, Django will validate on save only if you use full_clean;
        # keep minimal and just assign.
        order.status = next_status
        order.save(update_fields=["status", "updated_at"] if hasattr(order, "updated_at") else ["status"])

        # ✅ Add status history if model exists
        if OrderStatusHistory is not None:
            try:
                OrderStatusHistory.objects.create(
                    order=order,
                    status=next_status,
                    note=note,
                    changed_by=vendor,
                )
            except Exception:
                # don't block status update if history fails
                pass

        data = VendorOrderDetailSerializer(order, context={"request": request}).data
        return Response(data)


class VendorDashboardSummary(APIView):
    """
    GET /orders/vendor/dashboard/summary/

    Returns:
    - products: active products owned by vendor
    - totalOrders: count of orders that contain at least one vendor item
    - byStatus: vendor-scoped order counts by status
    - revenueTotal: vendor-scoped revenue sum (sum of vendor orderitems line_total)
    - monthlySales: last 12 months vendor revenue + orders count
    - topProducts: top-selling products for vendor (by quantity)
    """
    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user

        try:
            from catalog.models import Product
            products = Product.objects.filter(vendor=vendor, is_active=True).count()
        except Exception:
            products = 0

        vendor_order_qs = (
            Order.objects
            .annotate(
                vendor_items=Count(
                    "items",
                    filter=Q(items__product__vendor=vendor),
                    distinct=True
                )
            )
            .filter(vendor_items__gt=0)
        )

        total_orders = vendor_order_qs.count()

        by_status_rows = (
            vendor_order_qs
            .values("status")
            .annotate(c=Count("id"))
        )
        by_status = {row["status"]: row["c"] for row in by_status_rows}

        revenue_total = (
            OrderItem.objects
            .filter(product__vendor=vendor)
            .aggregate(total=Coalesce(Sum("line_total"), Value(0)))
            .get("total", 0)
        )

        now = timezone.now()
        start = (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=365))

        monthly_rows = (
            OrderItem.objects
            .filter(product__vendor=vendor, order__created_at__gte=start)
            .annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(
                revenue=Coalesce(Sum("line_total"), Value(0)),
                orders=Count("order_id", distinct=True),
            )
            .order_by("month")
        )

        monthly_sales = [
            {
                "month": row["month"].strftime("%Y-%m") if row["month"] else "",
                "revenue": float(row["revenue"] or 0),
                "orders": int(row["orders"] or 0),
            }
            for row in monthly_rows
        ]

        top_rows = (
            OrderItem.objects
            .filter(product__vendor=vendor)
            .values("product_id", "product__name")
            .annotate(
                units=Coalesce(Sum("quantity"), Value(0)),
                revenue=Coalesce(Sum("line_total"), Value(0)),
            )
            .order_by("-units", "-revenue")[:8]
        )

        top_products = []
        try:
            from catalog.models import ProductImage
            image_map = {
                x["product_id"]: x["image"]
                for x in (
                    ProductImage.objects
                    .filter(product_id__in=[r["product_id"] for r in top_rows])
                    .values("product_id", "image")
                )
            }
        except Exception:
            image_map = {}

        for r in top_rows:
            img = image_map.get(r["product_id"])
            top_products.append({
                "product_id": r["product_id"],
                "name": r["product__name"],
                "units": int(r["units"] or 0),
                "revenue": float(r["revenue"] or 0),
                "image": str(img) if img else None,
            })

        return Response({
            "products": products,
            "totalOrders": total_orders,
            "byStatus": by_status,
            "revenueTotal": float(revenue_total or 0),
            "monthlySales": monthly_sales,
            "topProducts": top_products,
        })
