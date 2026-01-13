from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .admin_views import AdminVendorListCreateView, AdminVendorDetailView

from .views import (
    MyTokenObtainPairView,
    RegisterView,
    MeView,
    ForgotPasswordView,
    ResetPasswordView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("admin/vendors/", AdminVendorListCreateView.as_view(), name="admin-vendors"),
    path("admin/vendors/<int:pk>/", AdminVendorDetailView.as_view(), name="admin-vendor-detail"),
]
