from rest_framework import generics, filters
from rest_framework.permissions import AllowAny
from django.db.models.functions import Random
from django.db.models import Q

from .models import Product, Category, SubCategory
from .serializers import (
    ProductSerializer,
    VendorProductWriteSerializer,
    CategorySerializer,
    VendorCategoryWriteSerializer,
    SubCategorySerializer,
    VendorSubCategoryWriteSerializer,
)

from admin_api.permissions import RequireVendor


# ======================
# PUBLIC VIEWS
# ======================

class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "brand", "slug", "sku"]
    ordering_fields = ["price", "created_at"]

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)

        category = self.request.query_params.get("category")
        subcategory = self.request.query_params.get("subcategory")

        if category:
            qs = qs.filter(category__slug=category)
        if subcategory:
            qs = qs.filter(subcategory__slug=subcategory)

        return qs.order_by(Random() if not category and not subcategory else "-created_at")


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    lookup_field = "slug"


class ProductDetailByIdView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    lookup_field = "pk"


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        # ✅ Show admin/global categories + vendor categories
        # ✅ Only active categories
        # ✅ Only categories owned by active vendors (prevents disabled vendor leaks)
        return (
            Category.objects.filter(is_active=True)
            .filter(Q(vendor__isnull=True) | Q(vendor__is_active=True))
            .order_by("sort_order", "name")
        )


class SubCategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SubCategorySerializer

    def get_queryset(self):
        # ✅ Same rule for subcategories
        return (
            SubCategory.objects.filter(is_active=True)
            .filter(Q(vendor__isnull=True) | Q(vendor__is_active=True))
            .order_by("sort_order", "name")
        )


# ======================
# VENDOR VIEWS (FIXED, minimal)
# NOTE: Your urls.py uses vendor_views.py already,
# but these are made correct to prevent accidental imports/leaks.
# ======================

class VendorProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]

    def get_queryset(self):
        # ✅ ONLY this vendor's active products
        return Product.objects.filter(vendor=self.request.user, is_active=True).order_by("-id")

    def get_serializer_class(self):
        return VendorProductWriteSerializer if self.request.method == "POST" else ProductSerializer

    def perform_create(self, serializer):
        # ✅ enforce vendor ownership on create
        serializer.save(vendor=self.request.user)


class VendorCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = VendorCategoryWriteSerializer

    def get_queryset(self):
        return Category.objects.filter(vendor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)


class VendorSubCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = VendorSubCategoryWriteSerializer

    def get_queryset(self):
        return SubCategory.objects.filter(vendor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)
