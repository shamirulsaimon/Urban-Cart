# catalog/admin_serializers.py
from rest_framework import serializers
from .models import Category, SubCategory, Product, ProductImage


# ---------- Category ----------
class AdminCategorySerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", required=False)
    sortOrder = serializers.IntegerField(source="sort_order", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "isActive", "sortOrder", "createdAt", "updatedAt"]
        read_only_fields = ["id", "slug", "createdAt", "updatedAt"]


# ---------- SubCategory ----------
class AdminSubCategorySerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", required=False)
    sortOrder = serializers.IntegerField(source="sort_order", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    # ✅ INPUT from frontend: { categoryId: 1, ... } -> writes category_id
    categoryId = serializers.IntegerField(source="category_id", required=True, write_only=True)

    # ✅ OUTPUT to frontend: categoryId: 1
    categoryIdOut = serializers.IntegerField(source="category_id", read_only=True)

    class Meta:
        model = SubCategory
        fields = [
            "id",
            "categoryId",      # write-only input
            "categoryIdOut",   # read-only output (we rename below)
            "name",
            "slug",
            "isActive",
            "sortOrder",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "slug", "createdAt", "updatedAt", "categoryIdOut"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # rename categoryIdOut -> categoryId for clean API output
        data["categoryId"] = data.pop("categoryIdOut", None)
        return data


# ---------- Product ----------
class StockAdjustSerializer(serializers.Serializer):
    setTo = serializers.IntegerField(required=False, min_value=0)
    delta = serializers.IntegerField(required=False)

    def validate(self, data):
        if "setTo" not in data and "delta" not in data:
            raise serializers.ValidationError("Provide either setTo or delta.")
        if "setTo" in data and "delta" in data:
            raise serializers.ValidationError("Provide only one: setTo OR delta.")
        return data


class AdminProductSerializer(serializers.ModelSerializer):
    # API names (your spec)
    title = serializers.CharField(source="name")
    isActive = serializers.BooleanField(source="is_active", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    discountType = serializers.CharField(source="discount_type", allow_null=True, required=False)
    discountValue = serializers.DecimalField(
        source="discount_value", max_digits=10, decimal_places=2, allow_null=True, required=False
    )
    discountStart = serializers.DateTimeField(source="discount_start", allow_null=True, required=False)
    discountEnd = serializers.DateTimeField(source="discount_end", allow_null=True, required=False)

    categoryId = serializers.IntegerField(source="category_id", allow_null=True, required=False)
    subcategoryId = serializers.IntegerField(source="subcategory_id", allow_null=True, required=False)

    tags = serializers.ListField(child=serializers.CharField(), required=False)

    # Output images as URL list
    images = serializers.SerializerMethodField()

    # Input images as real image files (multipart/form-data)
    imagesInput = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

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
            "images",       # output
            "imagesInput",  # input
            "categoryId",
            "subcategoryId",
            "brand",
            "tags",
            "isActive",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "slug", "createdAt", "updatedAt", "images"]

    def get_images(self, obj):
        request = self.context.get("request", None)
        out = []
        for img in obj.images.all():
            url = getattr(img.image, "url", str(img.image))
            if request and url and url.startswith("/"):
                url = request.build_absolute_uri(url)
            out.append(url)
        return out

    def validate(self, attrs):
        discount_type = attrs.get("discount_type", getattr(self.instance, "discount_type", None))
        discount_value = attrs.get("discount_value", getattr(self.instance, "discount_value", None))
        start = attrs.get("discount_start", getattr(self.instance, "discount_start", None))
        end = attrs.get("discount_end", getattr(self.instance, "discount_end", None))

        if not discount_type:
            attrs["discount_type"] = None
            attrs["discount_value"] = None
            attrs["discount_start"] = None
            attrs["discount_end"] = None
            return attrs

        if discount_value is None:
            raise serializers.ValidationError({"discountValue": "Required when discountType is set."})

        if start and end and end < start:
            raise serializers.ValidationError({"discountEnd": "discountEnd must be after discountStart."})

        return attrs

    def create(self, validated_data):
        images = validated_data.pop("imagesInput", [])
        tags = validated_data.pop("tags", None)
        if tags is not None:
            validated_data["tags"] = tags

        product = super().create(validated_data)

        for file_obj in images:
            ProductImage.objects.create(product=product, image=file_obj)

        return product

    def update(self, instance, validated_data):
        images = validated_data.pop("imagesInput", None)
        tags = validated_data.pop("tags", None)
        if tags is not None:
            validated_data["tags"] = tags

        instance = super().update(instance, validated_data)

        if images is not None:
            instance.images.all().delete()
            for file_obj in images:
                ProductImage.objects.create(product=instance, image=file_obj)

        return instance
