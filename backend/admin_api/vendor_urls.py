from django.urls import path
from .vendor_views import AdminVendorListCreateView, AdminVendorUpdateView

urlpatterns = [
    path("", AdminVendorListCreateView.as_view()),      # GET, POST
    path("<int:pk>/", AdminVendorUpdateView.as_view()), # PATCH
]
