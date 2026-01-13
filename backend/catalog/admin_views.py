from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import BasePermission

from .models import Product, Category, SubCategory
from .admin_serializers import (
    AdminProductSerializer,
    StockAdjustSerializer,
    AdminCategorySerializer,
    AdminSubCategorySerializer,
)


# =========================
# Permissions
# =========================
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_staff", False)
        )


def parse_bool(val):
    if val is None:
        return None
    v = str(val).strip().lower()
    if v in ("true", "1", "yes", "y"):
        return True
    if v in ("false", "0", "no", "n"):
        return False
    return None


def pick_is_active_param(request):
    """
    Support both:
      ?is_active=true  (frontend)
      ?isActive=true   (older)
    """
    return request.query_params.get("is_active", None) or request.query_params.get("isActive", None)


def safe_set_inactive(instance):
    """
    Soft delete safely without assuming updated_at exists.
    """
    instance.is_active = False
    try:
        instance.save(update_fields=["is_active", "updated_at"])
    except Exception:
        instance.save()


# =========================
# PRODUCTS
# =========================
class AdminProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminProductSerializer

    queryset = Product.objects.all()

    filter_backends = [SearchFilter, OrderingFilter]

    # ✅ FIXED: Product has "name", NOT "title"
    search_fields = ["name", "slug", "sku", "brand"]
    ordering_fields = ["created_at", "updated_at", "price", "stock", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()

        is_active = parse_bool(pick_is_active_param(self.request))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        category_id = self.request.query_params.get("categoryId") or self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        subcategory_id = self.request.query_params.get("subcategoryId") or self.request.query_params.get("subcategory")
        if subcategory_id:
            qs = qs.filter(subcategory_id=subcategory_id)

        brand = self.request.query_params.get("brand")
        if brand:
            qs = qs.filter(brand__iexact=brand)

        return qs


class AdminProductUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.all()
    lookup_field = "id"


class AdminProductStockAdjustView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def patch(self, request, id):
        product = Product.objects.select_for_update().get(id=id)

        ser = StockAdjustSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        if "setTo" in ser.validated_data:
            new_stock = ser.validated_data["setTo"]
        else:
            new_stock = product.stock + ser.validated_data["delta"]

        if new_stock < 0:
            return Response({"detail": "Stock cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)

        product.stock = new_stock
        try:
            product.save(update_fields=["stock", "updated_at"])
        except Exception:
            product.save()

        return Response({"id": product.id, "stock": product.stock})


# =========================
# CATEGORIES
# =========================
class AdminCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminCategorySerializer

    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["sort_order", "name", "created_at"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        qs = Category.objects.all()

        is_active = parse_bool(pick_is_active_param(self.request))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        return qs


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminCategorySerializer
    queryset = Category.objects.all()
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        safe_set_inactive(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# =========================
# SUBCATEGORIES
# =========================
class AdminSubCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminSubCategorySerializer

    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug", "category__name"]
    ordering_fields = ["sort_order", "name", "created_at"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        qs = SubCategory.objects.select_related("category").all()

        category_id = self.request.query_params.get("categoryId")
        if category_id:
            qs = qs.filter(category_id=category_id)

        is_active = parse_bool(pick_is_active_param(self.request))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        return qs


class AdminSubCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminSubCategorySerializer
    queryset = SubCategory.objects.all()
    lookup_field = "id"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        safe_set_inactive(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
