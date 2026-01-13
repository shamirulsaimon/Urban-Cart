from django.urls import path
from .admin_views import (
    AdminProductListCreateView,
    AdminProductUpdateView,
    AdminProductStockAdjustView,
    AdminCategoryListCreateView,
    AdminCategoryDetailView,
    AdminSubCategoryListCreateView,
    AdminSubCategoryDetailView,
)

urlpatterns = [
    # products
    path("products/", AdminProductListCreateView.as_view()),
    path("products/<int:id>/", AdminProductUpdateView.as_view()),
    path("products/<int:id>/stock/", AdminProductStockAdjustView.as_view()),

    # categories
    path("categories/", AdminCategoryListCreateView.as_view()),
    path("categories/<int:id>/", AdminCategoryDetailView.as_view()),

    # subcategories
    path("subcategories/", AdminSubCategoryListCreateView.as_view()),
    path("subcategories/<int:id>/", AdminSubCategoryDetailView.as_view()),
]
