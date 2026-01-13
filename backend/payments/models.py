from django.conf import settings
from django.db import models


class Payment(models.Model):
    METHOD_CHOICES = (
        ("cod", "Cash on Delivery"),
        ("sslcommerz", "SSLCommerz"),
    )

    STATUS_CHOICES = (
        ("initiated", "Initiated"),
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    )

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="payment",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="initiated")

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    transaction_id = models.CharField(max_length=120, blank=True, null=True)
    gateway_session_key = models.CharField(max_length=200, blank=True, null=True)
    raw_ipn = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment(order={self.order_id}, method={self.method}, status={self.status})"
