from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory


class CheckoutSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=30)
    address = serializers.CharField()
    city = serializers.CharField(max_length=80)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    # ✅ minimal update: allow online gateway method too
    payment_method = serializers.ChoiceField(choices=["cod", "sslcommerz"])  # add others later


class OrderItemSerializer(serializers.ModelSerializer):
    # ✅ new fields
    product_title = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "name",
            "sku",
            "price",
            "quantity",
            "line_total",
            # ✅ added
            "product_title",
            "product_image",
        ]

    def get_product_title(self, obj):
        # Prefer frozen snapshot name (stable), fallback to product title if needed
        if getattr(obj, "name", None):
            return obj.name
        p = getattr(obj, "product", None)
        return getattr(p, "title", None) or getattr(p, "name", None) or ""

    def get_product_image(self, obj):
        """
        Tries common image fields on Product.
        Returns absolute URL if request exists in serializer context.
        """
        p = getattr(obj, "product", None)
        if not p:
            return None

        # Try common direct fields
        img = (
            getattr(p, "image", None)
            or getattr(p, "image_url", None)
            or getattr(p, "thumbnail", None)
            or getattr(p, "photo", None)
            or getattr(p, "main_image", None)
        )

        # Try related images manager if you have one (optional)
        if not img and hasattr(p, "images"):
            try:
                first = p.images.first()
                if first:
                    img = getattr(first, "image", None) or getattr(first, "url", None)
            except Exception:
                pass

        if not img:
            return None

        # If ImageField / FieldFile
        try:
            url = img.url
        except Exception:
            url = str(img)

        if not url:
            return None

        request = self.context.get("request")

        # Make absolute if possible
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        if request and not url.startswith("http"):
            return request.build_absolute_uri("/" + url.lstrip("/"))

        return url


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "note", "changed_at", "changed_by"]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_method",
            "payment_status",
            "shipping_name",
            "phone",
            "address",
            "city",
            "note",
            "subtotal",
            "discount_total",
            "shipping_fee",
            "total",
            "created_at",
            "updated_at",
            "items",
            "status_history",
        ]
