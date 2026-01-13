from django.contrib.auth import get_user_model
from rest_framework import generics, serializers, status
from rest_framework.response import Response

from .permissions import RequireAdmin

User = get_user_model()


class AdminVendorCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value


class AdminVendorListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_active"]


class AdminVendorUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=True)


class AdminVendorListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireAdmin]

    def get_queryset(self):
        qs = User.objects.filter(role="vendor").order_by("-id")
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(email__icontains=search)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminVendorCreateSerializer
        return AdminVendorListSerializer

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        u = User.objects.create_user(
            email=ser.validated_data["email"],
            password=ser.validated_data["password"],
            first_name=ser.validated_data.get("first_name", ""),
            last_name=ser.validated_data.get("last_name", ""),
        )
        u.role = "vendor"
        u.is_active = True
        u.save(update_fields=["role", "is_active"])

        return Response(AdminVendorListSerializer(u).data, status=status.HTTP_201_CREATED)


class AdminVendorUpdateView(generics.GenericAPIView):
    permission_classes = [RequireAdmin]
    serializer_class = AdminVendorUpdateSerializer

    def patch(self, request, pk):
        try:
            vendor = User.objects.get(pk=pk, role="vendor")
        except User.DoesNotExist:
            return Response({"detail": "Vendor not found."}, status=404)

        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        vendor.is_active = ser.validated_data["is_active"]
        vendor.save(update_fields=["is_active"])

        return Response(AdminVendorListSerializer(vendor).data, status=200)
