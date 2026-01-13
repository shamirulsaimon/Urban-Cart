from django.urls import path
from .views import (
    CheckoutView,
    MyOrdersListView,
    MyOrderDetailView,
    MyOrderInvoiceView,
)

from .vendor_views import VendorOrdersList, VendorOrderDetail
from .vendor_dashboard_views import VendorDashboardSummaryView

urlpatterns = [
    # Checkout
    path("checkout/", CheckoutView.as_view()),

    # Customer orders
    path("my/", MyOrdersListView.as_view()),
    path("my/<int:id>/", MyOrderDetailView.as_view()),
    path("my/<int:id>/invoice/", MyOrderInvoiceView.as_view()),

    # =====================
    # Vendor
    # =====================
    path("vendor/orders/", VendorOrdersList.as_view(), name="vendor-orders"),
    path("vendor/orders/<int:pk>/", VendorOrderDetail.as_view(), name="vendor-order-detail"),
    path("vendor/dashboard/summary/", VendorDashboardSummaryView.as_view(), name="vendor-dashboard-summary"),
]
