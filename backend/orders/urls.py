from django.urls import path
from .views import (
    CheckoutView,
    MyOrdersListView,
    MyOrderDetailView,
    MyOrderInvoiceView,
)
from .vendor_reports_views import (
    VendorSalesReportOverallXlsx,
    VendorSalesReportMonthlyXlsx,
)

from .vendor_views import VendorOrdersList, VendorOrderDetail
from .vendor_dashboard_views import VendorDashboardSummaryView
from .views import DemoSendOtpView, DemoVerifyOtpView
urlpatterns = [
    # Checkout
    path("checkout/", CheckoutView.as_view()),
    
    # Demo OTP for payments
    path("demo/send-otp/", DemoSendOtpView.as_view(), name="demo-send-otp"),
    path("demo/verify-otp/", DemoVerifyOtpView.as_view(), name="demo-verify-otp"),
    
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
    
    path( "vendor/reports/sales.xlsx",VendorSalesReportOverallXlsx.as_view(), name="vendor-sales-overall-xlsx",),
    path("vendor/reports/sales-monthly.xlsx",VendorSalesReportMonthlyXlsx.as_view(),name="vendor-sales-monthly-xlsx",),
]
