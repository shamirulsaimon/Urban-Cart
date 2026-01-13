from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from admin_api.permissions import RequireVendor

from .models import Product, Category, SubCategory, ProductImage
from .serializers import (
    VendorProductWriteSerializer,
    ProductSerializer,
    VendorCategoryWriteSerializer,
    VendorSubCategoryWriteSerializer,
    ProductImageSerializer,
    ReorderImagesSerializer,
)

# =========================
# VENDOR PRODUCTS
# =========================

class VendorProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]

    def get_queryset(self):
        # ✅ ONLY products owned by this vendor
        return Product.objects.filter(
            vendor_id=self.request.user.id,
            is_active=True
        ).order_by("-id")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VendorProductWriteSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        # ✅ Force vendor ownership on create
        serializer.save(vendor=self.request.user)

    def list(self, request, *args, **kwargs):
        # ✅ keep the same JSON body, add a debug header to confirm correct view
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        res = Response(serializer.data)
        res["X-Vendor-Only"] = "1"
        res["X-Vendor-UserId"] = str(request.user.id)
        return res


class VendorProductDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = VendorProductWriteSerializer

    def get_queryset(self):
        # ✅ only this vendor’s products
        return Product.objects.filter(vendor_id=self.request.user.id)


class VendorProductDeleteView(generics.DestroyAPIView):
    permission_classes = [RequireVendor]

    def get_queryset(self):
        # ✅ only this vendor’s products
        return Product.objects.filter(vendor_id=self.request.user.id)

    # Soft delete
    def delete(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_active = False
        product.save(update_fields=["is_active"])
        return Response({"detail": "Product deactivated"}, status=status.HTTP_200_OK)


# =========================
# VENDOR PRODUCT IMAGES (LIST + UPLOAD)
# =========================

class VendorProductImageListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = ProductImageSerializer

    def _get_product(self):
        product_id = self.kwargs["product_id"]
        try:
            return Product.objects.get(id=product_id, vendor_id=self.request.user.id)
        except Product.DoesNotExist:
            return None

    def get_queryset(self):
        product = self._get_product()
        if not product:
            return ProductImage.objects.none()

        try:
            return ProductImage.objects.filter(product=product).order_by("sort_order", "id")
        except Exception:
            return ProductImage.objects.filter(product=product).order_by("id")

    def create(self, request, *args, **kwargs):
        product = self._get_product()
        if not product:
            return Response({"detail": "Product not found."}, status=404)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        product = self._get_product()
        if not product:
            return

        # append at end
        try:
            last = ProductImage.objects.filter(product=product).order_by("-sort_order", "-id").first()
            next_order = (last.sort_order if last and last.sort_order is not None else 0) + 1
            serializer.save(product=product, sort_order=next_order)
        except Exception:
            serializer.save(product=product)


class VendorProductImageDeleteView(APIView):
    permission_classes = [RequireVendor]

    def delete(self, request, image_id):
        img = (
            ProductImage.objects
            .select_related("product")
            .filter(id=image_id, product__vendor_id=request.user.id)
            .first()
        )
        if not img:
            return Response({"detail": "Image not found."}, status=404)

        img.delete()
        return Response({"detail": "Image deleted."}, status=200)


class VendorProductImageReorderView(APIView):
    permission_classes = [RequireVendor]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id, vendor_id=request.user.id)
        except Product.DoesNotExist:
            return Response({"detail": "Product not found."}, status=404)

        ser = ReorderImagesSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ordered_ids = ser.validated_data["ordered_ids"]

        imgs = list(ProductImage.objects.filter(product=product, id__in=ordered_ids))
        if len(imgs) != len(set(ordered_ids)):
            return Response({"detail": "Some images do not belong to this product."}, status=400)

        id_to_idx = {img_id: idx for idx, img_id in enumerate(ordered_ids, start=1)}
        for img in imgs:
            img.sort_order = id_to_idx.get(img.id, 0)

        ProductImage.objects.bulk_update(imgs, ["sort_order"])
        return Response({"detail": "Reordered."}, status=200)


# =========================
# VENDOR CATEGORIES
# =========================

class VendorCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = VendorCategoryWriteSerializer

    def get_queryset(self):
        return Category.objects.filter(vendor_id=self.request.user.id)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)


class VendorSubCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [RequireVendor]
    serializer_class = VendorSubCategoryWriteSerializer

    def get_queryset(self):
        return SubCategory.objects.filter(vendor_id=self.request.user.id)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)
