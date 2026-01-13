from django.db.models import Prefetch, Count, Q, F
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsVendorRole
from .models import Order, OrderItem
from .serializers_vendor import VendorOrderSerializer, VendorOrderDetailSerializer


class VendorOrdersList(APIView):
    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor = request.user

        # ✅ STRICT: only orders where ALL items belong to this vendor
        qs = (
            Order.objects
            .annotate(
                total_items=Count("items", distinct=True),
                vendor_items=Count("items", filter=Q(items__product__vendor=vendor), distinct=True),
            )
            .filter(vendor_items__gt=0)
            .filter(total_items=F("vendor_items"))
            .order_by("-id")
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.filter(product__vendor=vendor).select_related("product"),
                )
            )
        )

        data = VendorOrderSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class VendorOrderDetail(APIView):
    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request, pk):
        vendor = request.user

        order = (
            Order.objects
            .annotate(
                total_items=Count("items", distinct=True),
                vendor_items=Count("items", filter=Q(items__product__vendor=vendor), distinct=True),
            )
            .filter(id=pk, vendor_items__gt=0, total_items=F("vendor_items"))
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.filter(product__vendor=vendor).select_related("product"),
                )
            )
            .first()
        )

        if not order:
            return Response({"detail": "Not found."}, status=404)

        data = VendorOrderDetailSerializer(order, context={"request": request}).data
        return Response(data)
