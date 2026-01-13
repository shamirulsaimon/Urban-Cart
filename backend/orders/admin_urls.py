from rest_framework.routers import DefaultRouter
from .admin_views import AdminOrderViewSet

router = DefaultRouter()
# Because admin_api/urls.py includes this file at path("orders/", include("orders.admin_urls")),
# we register "" here so the final endpoint becomes:
# /api/admin/orders/
router.register(r"", AdminOrderViewSet, basename="admin-orders")

urlpatterns = router.urls
