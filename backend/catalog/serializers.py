from rest_framework import serializers
from .models import Product, Category, SubCategory, ProductImage


# ======================
# CATEGORY SERIALIZERS
# ======================

class CategorySerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "isActive"]


class VendorCategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["vendor"] = request.user
        return super().create(validated_data)


class SubCategorySerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    categoryId = serializers.IntegerField(source="category_id", read_only=True)

    class Meta:
        model = SubCategory
        fields = ["id", "categoryId", "name", "slug", "isActive"]


class VendorSubCategoryWriteSerializer(serializers.ModelSerializer):
    categoryId = serializers.IntegerField(source="category_id", read_only=True)

    class Meta:
        model = SubCategory
        fields = ["id", "name", "category", "categoryId"]

    def validate(self, attrs):
        """
        ✅ Prevent vendor from creating subcategory under someone else's category.
        Allows admin/global categories (vendor is None) if you ever use them.
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)

        category = attrs.get("category")
        if category and category.vendor and user and category.vendor_id != user.id:
            raise serializers.ValidationError({"category": "You can only use your own categories."})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["vendor"] = request.user
        return super().create(validated_data)


# ======================
# PRODUCT SERIALIZERS
# ======================

def _to_url(request, value):
    if not value:
        return ""
    try:
        url = value.url if hasattr(value, "url") else str(value)
    except Exception:
        url = str(value)

    if request and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


class ProductSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    categoryId = serializers.IntegerField(source="category_id", read_only=True)
    subcategoryId = serializers.IntegerField(source="subcategory_id", read_only=True)

    discountType = serializers.CharField(source="discount_type", read_only=True)
    discountValue = serializers.DecimalField(
        source="discount_value", max_digits=10, decimal_places=2, read_only=True
    )
    discountStart = serializers.DateTimeField(source="discount_start", read_only=True)
    discountEnd = serializers.DateTimeField(source="discount_end", read_only=True)

    # IMPORTANT: keep as URL list (don’t break existing frontend)
    images = serializers.SerializerMethodField()

    def get_images(self, obj):
        request = self.context.get("request")
        try:
            imgs = obj.images.all().order_by("sort_order", "id")
        except Exception:
            imgs = obj.images.all().order_by("id")
        return [_to_url(request, img.image) for img in imgs]

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "price",
            "discountType",
            "discountValue",
            "discountStart",
            "discountEnd",
            "stock",
            "sku",
            "brand",
            "tags",
            "images",
            "categoryId",
            "subcategoryId",
            "isActive",
            "createdAt",
            "updatedAt",
        ]


class VendorProductWriteSerializer(serializers.ModelSerializer):
    """
    ✅ Vendor write serializer:
    - Allows vendor to set category/subcategory safely (ownership validated)
    - Allows vendor to set discount fields (dates optional)
    - Keeps existing structure and fields
    """

    # Accept camelCase from frontend while writing to snake_case fields in DB
    discountType = serializers.ChoiceField(
        source="discount_type",
        choices=Product.DISCOUNT_CHOICES,
        required=False,
        allow_null=True
    )
    discountValue = serializers.DecimalField(
        source="discount_value",
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    discountStart = serializers.DateTimeField(
        source="discount_start",
        required=False,
        allow_null=True
    )
    discountEnd = serializers.DateTimeField(
        source="discount_end",
        required=False,
        allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "sku",
            "brand",
            "tags",
            "category",
            "subcategory",

            # ✅ NEW: discount write support (camelCase inputs)
            "discountType",
            "discountValue",
            "discountStart",
            "discountEnd",
        ]

    def validate(self, attrs):
        """
        ✅ Critical security:
        - vendor can only use their own Category/SubCategory
        - subcategory must belong to category (if both provided)
        - discountStart/End are optional (Option A)
        """
        request = self.context.get("request")
        user = getattr(request, "user", None)

        category = attrs.get("category")
        subcategory = attrs.get("subcategory")

        if category and category.vendor and user and category.vendor_id != user.id:
            raise serializers.ValidationError({"category": "You can only use your own categories."})

        if subcategory:
            # If subcategory has vendor set, enforce ownership
            if subcategory.vendor and user and subcategory.vendor_id != user.id:
                raise serializers.ValidationError({"subcategory": "You can only use your own subcategories."})

            # Also ensure subcategory's category belongs to vendor (if vendor set there)
            if subcategory.category and subcategory.category.vendor and user and subcategory.category.vendor_id != user.id:
                raise serializers.ValidationError({"subcategory": "This subcategory belongs to another vendor."})

        if category and subcategory and subcategory.category_id != category.id:
            raise serializers.ValidationError({"subcategory": "Subcategory does not belong to selected category."})

        # Discount validation (dates optional)
        discount_type = attrs.get("discount_type")
        discount_value = attrs.get("discount_value")

        if discount_type and (discount_value is None):
            raise serializers.ValidationError({"discountValue": "discountValue is required when discountType is set."})

        if discount_value is not None and discount_value < 0:
            raise serializers.ValidationError({"discountValue": "discountValue must be >= 0."})

        # If percent, keep it sane
        if discount_type == Product.DISCOUNT_PERCENT and discount_value is not None and discount_value > 100:
            raise serializers.ValidationError({"discountValue": "Percent discount cannot exceed 100."})

        # If dates exist, ensure start <= end
        ds = attrs.get("discount_start")
        de = attrs.get("discount_end")
        if ds and de and ds > de:
            raise serializers.ValidationError({"discountEnd": "discountEnd must be after discountStart."})

        return attrs

    def create(self, validated_data):
        validated_data["vendor"] = self.context["request"].user
        return super().create(validated_data)


# ======================
# VENDOR IMAGE MGMT
# ======================

class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    sortOrder = serializers.IntegerField(source="sort_order", read_only=True)

    class Meta:
        model = ProductImage
        fields = ["id", "url", "sortOrder", "image"]
        extra_kwargs = {
            "image": {"write_only": True}  # upload only
        }

    def get_url(self, obj):
        request = self.context.get("request")
        return _to_url(request, obj.image)


class ReorderImagesSerializer(serializers.Serializer):
    ordered_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
