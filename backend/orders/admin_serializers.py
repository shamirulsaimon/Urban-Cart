from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory


def _best_user_name(user):
    if not user:
        return None
    full = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return full or getattr(user, "username", None) or getattr(user, "email", None)



def _product_image_url(product, request=None):
    """
    Tries common Product image field names safely:
    image, thumbnail, main_image, photo, picture
    Also supports string URL fields like image_url if present.
    Also supports related ProductImage via product.images (related_name="images").
    Returns absolute URL if request is available.
    """
    if not product:
        return None

    # direct URL string field (if you ever add one later)
    url_string = getattr(product, "image_url", None)
    if url_string:
        if request and isinstance(url_string, str) and url_string.startswith("/"):
            return request.build_absolute_uri(url_string)
        return url_string

    # direct ImageField/FileField on Product (not used in your current Product model)
    candidates = ["image", "thumbnail", "main_image", "photo", "picture"]
    for f in candidates:
        val = getattr(product, f, None)
        if not val:
            continue

        if hasattr(val, "url"):
            url = getattr(val, "url", None)
            if url:
                return request.build_absolute_uri(url) if request else url

        if isinstance(val, str) and val.strip():
            url = val.strip()
            if request and url.startswith("/"):
                return request.build_absolute_uri(url)
            if request and not url.startswith("http"):
                return request.build_absolute_uri("/" + url.lstrip("/"))
            return url

    # ✅ IMPORTANT: your real architecture uses ProductImage (related_name="images")
    # catalog/models.py: ProductImage.product related_name="images" :contentReference[oaicite:1]{index=1}
    if hasattr(product, "images"):
        try:
            img_obj = product.images.first()
            if img_obj and getattr(img_obj, "image", None) and hasattr(img_obj.image, "url"):
                url = img_obj.image.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            pass

    return None


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",          # product id
            "product_title",    # product name/title (from Product or snapshot)
            "product_image",    # product image URL (best-effort)
            "name",             # snapshot name at purchase time
            "sku",
            "price",
            "quantity",
            "line_total",
        ]

    def get_product_title(self, obj):
        # Prefer the snapshot name stored in OrderItem, fallback to Product.title/name
        if getattr(obj, "name", None):
            return obj.name
        p = getattr(obj, "product", None)
        return getattr(p, "title", None) or getattr(p, "name", None)

    def get_product_image(self, obj):
        request = self.context.get("request")
        return _product_image_url(getattr(obj, "product", None), request=request)


class AdminOrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = [
            "id",
            "status",
            "note",
            "changed_at",
            "changed_by",
            "changed_by_email",
        ]

    def get_changed_by_email(self, obj):
        return getattr(obj.changed_by, "email", None)


class AdminOrderListSerializer(serializers.ModelSerializer):
    customer_email = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    # ✅ add preview fields for the admin table (minimal + fast)
    first_item_title = serializers.SerializerMethodField()
    first_item_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_status",
            "total",
            "customer_name",
            "customer_email",
            "items_count",
            "first_item_title",
            "first_item_image",
            "created_at",
            "updated_at",
        ]

    def get_customer_email(self, obj):
        return getattr(obj.user, "email", None)

    def get_customer_name(self, obj):
        if getattr(obj, "shipping_name", None):
            return obj.shipping_name
        return _best_user_name(getattr(obj, "user", None))

    def get_items_count(self, obj):
        try:
            return obj.items.count()
        except Exception:
            return 0

    def _first_item(self, obj):
        try:
            return obj.items.select_related("product").order_by("id").first()
        except Exception:
            return None

    def get_first_item_title(self, obj):
        it = self._first_item(obj)
        if not it:
            return None
        if getattr(it, "name", None):
            return it.name
        p = getattr(it, "product", None)
        return getattr(p, "title", None) or getattr(p, "name", None)

    def get_first_item_image(self, obj):
        it = self._first_item(obj)
        if not it:
            return None
        request = self.context.get("request")
        return _product_image_url(getattr(it, "product", None), request=request)


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    customer_email = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    items = AdminOrderItemSerializer(many=True, read_only=True)
    status_history = AdminOrderStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_status",
            "payment_method",
            "shipping_name",
            "phone",
            "address",
            "city",
            "subtotal",
            "discount_total",
            "shipping_fee",
            "total",
            "customer_name",
            "customer_email",
            "items",
            "note",
            "status_history",
            "created_at",
            "updated_at",
        ]

    def get_customer_email(self, obj):
        return getattr(obj.user, "email", None)

    def get_customer_name(self, obj):
        if getattr(obj, "shipping_name", None):
            return obj.shipping_name
        return _best_user_name(getattr(obj, "user", None))


class AdminOrderUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices, required=False)
    payment_status = serializers.ChoiceField(choices=Order.PaymentStatus.choices, required=False)
    payment_method = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
