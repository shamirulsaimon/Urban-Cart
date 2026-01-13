from rest_framework import serializers
from .models import Cart, CartItem
from catalog.models import Product
from catalog.serializers import ProductSerializer


class CartItemSerializer(serializers.ModelSerializer):
    # keep product details in response
    product = ProductSerializer(read_only=True)

    # accept productId in request, return productId in response
    productId = serializers.IntegerField(write_only=True)
    product_id_out = serializers.IntegerField(source="product_id", read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "productId", "product_id_out", "qty", "product"]

    def to_representation(self, instance):
        """
        Output should stay exactly like your old API:
        { id, productId, qty, product }
        """
        data = super().to_representation(instance)
        data["productId"] = data.pop("product_id_out")
        data.pop("productId", None)  # remove write_only field if it appears
        data["productId"] = instance.product_id
        return data

    def validate(self, attrs):
        """
        Enforce:
        - qty >= 1
        - qty <= product.stock
        - product exists and is active (optional but recommended)
        """
        qty = attrs.get("qty")
        product_id = attrs.get("productId")

        if qty is None:
            # if PATCH and qty isn't provided, use instance qty
            qty = getattr(self.instance, "qty", None)

        if qty is None:
            raise serializers.ValidationError({"qty": "Quantity is required."})

        if int(qty) < 1:
            raise serializers.ValidationError({"qty": "Quantity must be at least 1."})

        # Determine product (for PATCH, productId might be missing)
        if product_id is None and self.instance is not None:
            product = self.instance.product
        else:
            try:
                product = Product.objects.get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"productId": "Product not found."})

        # Stock validation (this is the key fix)
        stock = int(getattr(product, "stock", 0) or 0)
        if int(qty) > stock:
            raise serializers.ValidationError(
                {"qty": f"Only {stock} item(s) available in stock."}
            )

        # store product object for create/update
        attrs["product"] = product
        attrs.pop("productId", None)

        return attrs

    def create(self, validated_data):
        """
        If item already exists in cart, update qty instead of duplicate row.
        This prevents duplicated cart items.
        """
        cart = validated_data.get("cart")
        product = validated_data.get("product")
        qty = int(validated_data.get("qty", 1))

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"qty": qty},
        )

        if not created:
            # merging qty must still respect stock (already validated for new qty in request)
            item.qty = qty
            item.save(update_fields=["qty"])

        return item

    def update(self, instance, validated_data):
        # Only qty is expected to change
        instance.qty = int(validated_data.get("qty", instance.qty))
        instance.save(update_fields=["qty"])
        return instance


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "items", "updated_at"]
