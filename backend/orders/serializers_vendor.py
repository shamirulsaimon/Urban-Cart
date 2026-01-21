from rest_framework import serializers
from .models import Order, OrderItem

# ✅ Optional: If your project has OrderStatusHistory
try:
    from .models import OrderStatusHistory
except Exception:
    OrderStatusHistory = None


class VendorOrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_title",
            "product_image",
            "price",
            "quantity",
            "subtotal",
        ]

    def get_product_title(self, obj):
        if getattr(obj, "name", None):
            return obj.name

        p = getattr(obj, "product", None)
        if not p:
            return ""

        return getattr(p, "title", None) or getattr(p, "name", "") or ""

    def get_subtotal(self, obj):
        try:
            return str(obj.price * obj.quantity)
        except Exception:
            return None

    def get_product_image(self, obj):
        request = self.context.get("request")
        p = getattr(obj, "product", None)
        if not p:
            return None

        url = None

        if hasattr(p, "image") and p.image:
            try:
                url = p.image.url
            except Exception:
                pass

        if not url and hasattr(p, "image_url") and p.image_url:
            url = p.image_url

        if not url and hasattr(p, "images"):
            try:
                first = p.images.order_by("sort_order", "id").first()
                if first:
                    if hasattr(first, "image") and first.image:
                        url = first.image.url
                    elif hasattr(first, "url"):
                        url = first.url
            except Exception:
                pass

        if not url:
            return None

        if request and isinstance(url, str) and url.startswith("/"):
            return request.build_absolute_uri(url)

        return url


class VendorOrderSerializer(serializers.ModelSerializer):
    # ✅ Vendor-only items (important for multi-vendor orders)
    items = serializers.SerializerMethodField()

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

    def get_items(self, obj):
        request = self.context.get("request")
        vendor = getattr(request, "user", None) if request else None

        qs = obj.items.all().select_related("product")
        if vendor and getattr(vendor, "is_authenticated", False):
            qs = qs.filter(product__vendor=vendor)

        return VendorOrderItemSerializer(qs, many=True, context=self.context).data


class VendorOrderDetailSerializer(VendorOrderSerializer):
    status_history = serializers.SerializerMethodField()

    class Meta(VendorOrderSerializer.Meta):
        fields = VendorOrderSerializer.Meta.fields + ["status_history"]

    def get_status_history(self, obj):
        if OrderStatusHistory is None:
            return []

        try:
            qs = obj.status_history.all().order_by("changed_at")
        except Exception:
            # if related_name isn't "status_history", fallback to model query
            qs = OrderStatusHistory.objects.filter(order=obj).order_by("changed_at")

        out = []
        for h in qs:
            out.append({
                "id": getattr(h, "id", None),
                "status": getattr(h, "status", None),
                "note": getattr(h, "note", "") or "",
                "changed_at": getattr(h, "changed_at", None),
                "changed_by": getattr(getattr(h, "changed_by", None), "username", None)
                              or getattr(getattr(h, "changed_by", None), "email", None)
                              or getattr(h, "changed_by_id", None),
            })
        return out
