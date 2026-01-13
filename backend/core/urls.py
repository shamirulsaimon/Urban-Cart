from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import TokenRefreshView
from admin_api.auth_views import UrbanCartTokenView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", UrbanCartTokenView.as_view(), name="login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api/auth/", include("accounts.urls")),

    # Public APIs
    path("api/catalog/", include("catalog.urls")),

    # Admin APIs
    path("api/admin/", include("catalog.admin_urls")),
    path("api/admin/", include("admin_api.urls")),
    # ❌ REMOVE this line (orders admin routes are already included via admin_api.urls -> "orders/")
    # path("api/admin/", include("orders.admin_urls")),

    # Cart + Orders (customer)
    path("api/cart/", include("cart.urls")),
    path("api/orders/", include("orders.urls")),

    # Payments
    path("api/payments/", include("payments.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
