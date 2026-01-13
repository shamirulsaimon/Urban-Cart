from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    orderId = serializers.IntegerField(source="order_id", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "orderId",
            "method",
            "status",
            "amount",
            "transaction_id",
            "created_at",
            "updated_at",
        ]


class InitiatePaymentSerializer(serializers.Serializer):
    orderId = serializers.IntegerField()
    method = serializers.CharField()

    def validate_method(self, value):
        v = (value or "").strip().lower()
        if v in ["cod", "cash", "cash_on_delivery"]:
            return "cod"
        if v in ["sslcommerz", "ssl", "online", "card"]:
            return "sslcommerz"
        if v in ["COD".lower(), "SSLCOMMERZ".lower()]:
            return v
        raise serializers.ValidationError("Invalid payment method.")
