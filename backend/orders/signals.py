from django.db.models.signals import post_save
from django.dispatch import receiver

from .emails import send_order_placed_email, send_order_status_email
from .models import Order

# If you have a different model name, adjust this import:
# Example: OrderStatusHistory, StatusHistory, OrderHistory, etc.
try:
    from .models import OrderStatusHistory
except Exception:
    OrderStatusHistory = None


@receiver(post_save, sender=Order)
def order_created_email(sender, instance, created, **kwargs):
    # Send only once when order is first created
    if created:
        send_order_placed_email(instance)


if OrderStatusHistory:
    @receiver(post_save, sender=OrderStatusHistory)
    def status_history_email(sender, instance, created, **kwargs):
        # Send when a new status history entry is created
        if not created:
            return

        order = getattr(instance, "order", None)
        if not order:
            return

        status = getattr(instance, "status", None)
        note = getattr(instance, "note", "") or ""
        changed_by = getattr(instance, "changed_by", None)

        # Avoid spamming on initial "pending/order created" if you want:
        # Comment out the next 2 lines if you want ALL updates mailed.
        if (status or "").lower() == "pending":
            return

        send_order_status_email(order, status=status, note=note, changed_by=changed_by)
