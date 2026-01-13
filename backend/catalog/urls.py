from django.urls import path

# Public views (unchanged)
from .views import (
    ProductListView,
    ProductDetailView,
    ProductDetailByIdView,
    CategoryListView,
    SubCategoryListView,
)

# Vendor views
from .vendor_views import (
    VendorProductListCreateView,
    VendorProductDetailView,
    VendorProductDeleteView,
    VendorProductImageListCreateView,
    VendorProductImageDeleteView,
    VendorProductImageReorderView,
    VendorCategoryListCreateView,
    VendorSubCategoryListCreateView,
)

urlpatterns = [
    # =====================
    # Public
    # =====================
    path("products/", ProductListView.as_view()),
    path("products/<int:pk>/", ProductDetailByIdView.as_view()),
    path("products/slug/<slug:slug>/", ProductDetailView.as_view()),
    path("categories/", CategoryListView.as_view()),
    path("subcategories/", SubCategoryListView.as_view()),

    # =====================
    # Vendor
    # =====================
    path("vendor/products/", VendorProductListCreateView.as_view()),
    path("vendor/products/<int:pk>/", VendorProductDetailView.as_view()),
    path("vendor/products/<int:pk>/delete/", VendorProductDeleteView.as_view()),

    # Images: list + upload
    path("vendor/products/<int:product_id>/images/", VendorProductImageListCreateView.as_view()),
    # Images: delete
    path("vendor/products/images/<int:image_id>/", VendorProductImageDeleteView.as_view()),
    # Images: reorder
    path("vendor/products/<int:product_id>/images/reorder/", VendorProductImageReorderView.as_view()),

    path("vendor/categories/", VendorCategoryListCreateView.as_view()),
    path("vendor/subcategories/", VendorSubCategoryListCreateView.as_view()),
]
