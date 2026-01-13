from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from catalog.models import Product
from orders.models import Order


class VendorDashboardSummaryView(APIView):
    """
    Vendor-only dashboard summary:
    - products count
    - orders count (orders that include vendor items)
    - by_status breakdown
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = request.user

        products_count = Product.objects.filter(vendor=vendor, is_active=True).count()

        # Orders that contain vendor items
        orders_qs = Order.objects.filter(items__vendor=vendor).distinct()

        total_orders = orders_qs.count()

        # Status breakdown
        by_status = {}
        for s in ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]:
            by_status[s] = orders_qs.filter(status=s).count()

        return Response({
            "products": products_count,
            "totalOrders": total_orders,
            "byStatus": by_status,
        })
