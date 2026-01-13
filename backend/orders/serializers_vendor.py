from rest_framework import serializers
from .models import Order, OrderItem

class VendorOrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True)
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_title", "product_image", "price", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        try:
            return str(obj.price * obj.quantity)
        except Exception:
            return None

    def get_product_image(self, obj):
        """
        Supports:
        - Product.image (ImageField) OR Product.image_url (CharField)
        - OR Product has related ProductImage model: product.images.first().image / url
        Adjust the logic to your actual model fields.
        """
        request = self.context.get("request")

        url = None

        # 1) If Product has ImageField: product.image
        if hasattr(obj.product, "image") and obj.product.image:
            try:
                url = obj.product.image.url
            except Exception:
                url = None

        # 2) If Product stores URL string: product.image_url
        if not url and hasattr(obj.product, "image_url") and obj.product.image_url:
            url = obj.product.image_url

        # 3) If you have ProductImage relation named "images"
        if not url and hasattr(obj.product, "images"):
            first = obj.product.images.order_by("sort_order", "id").first()
            if first:
                if hasattr(first, "image") and first.image:
                    try:
                        url = first.image.url
                    except Exception:
                        url = None
                if not url and hasattr(first, "url") and first.url:
                    url = first.url

        if not url:
            return None

        # make absolute
        if request and isinstance(url, str) and url.startswith("/"):
            return request.build_absolute_uri(url)

        return url


class VendorOrderSerializer(serializers.ModelSerializer):
    items = VendorOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_status",
            "total",
            "created_at",
            "shipping_name",
            "phone",
            "city",
            "address",
            "items",
        ]


class VendorOrderDetailSerializer(VendorOrderSerializer):
    # if you have status history field(s), include them here
    status_history = serializers.SerializerMethodField()

    class Meta(VendorOrderSerializer.Meta):
        fields = VendorOrderSerializer.Meta.fields + ["status_history"]

    def get_status_history(self, obj):
        # If you have a related model for history, adapt this.
        # Otherwise return empty list (frontend shows fallback).
        return []
