from django.urls import path, include
from .views import AdminMeView, AdminDashboardSummaryView

urlpatterns = [
    path("me/", AdminMeView.as_view()),
    path("dashboard/summary/", AdminDashboardSummaryView.as_view()),

    # ✅ Orders admin routes ONLY under /api/admin/orders/
    path("orders/", include("orders.admin_urls")),

    # ✅ Catalog admin routes mounted at /api/admin/...
    path("", include("catalog.admin_urls")),

    # ✅ NEW: Vendor management under /api/admin/vendors/
    path("vendors/", include("admin_api.vendor_urls")),
]
