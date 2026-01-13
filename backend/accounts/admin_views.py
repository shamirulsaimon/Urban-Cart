from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.response import Response

from .permissions import IsAdminRole
from .admin_serializers import (
    AdminVendorSerializer,
    AdminVendorCreateSerializer,
    AdminVendorUpdateSerializer,
)

User = get_user_model()


class AdminVendorListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/admin/vendors/?search=email_part
    POST /api/admin/vendors/
    """
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = User.objects.filter(role="vendor").order_by("-id")
        q = (self.request.query_params.get("search") or "").strip()
        if q:
            qs = qs.filter(email__icontains=q)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminVendorCreateSerializer
        return AdminVendorSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save(role="vendor", is_active=True)

        out = AdminVendorSerializer(vendor)
        return Response(out.data, status=status.HTTP_201_CREATED)


class AdminVendorDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/vendors/<id>/
    PATCH /api/admin/vendors/<id>/   (toggle is_active)
    """
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role="vendor")
    serializer_class = AdminVendorSerializer

    def patch(self, request, *args, **kwargs):
        vendor = self.get_object()
        serializer = AdminVendorUpdateSerializer(vendor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        return Response(AdminVendorSerializer(vendor).data, status=status.HTTP_200_OK)
