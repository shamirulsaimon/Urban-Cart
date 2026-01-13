from django.conf import settings
from django.core.mail import send_mail


def _safe_email(order):
    # adapt to your serializer fields; best guess
    return (
        getattr(order, "customer_email", None)
        or getattr(order, "email", None)
        or getattr(getattr(order, "user", None), "email", None)
    )


def send_order_placed_email(order):
    to_email = _safe_email(order)
    if not to_email:
        return

    subject = f"Urban Cart — Order placed (#{getattr(order, 'order_number', order.id)})"
    message = (
        f"Thanks for your order!\n\n"
        f"Order: #{getattr(order, 'order_number', order.id)}\n"
        f"Status: {getattr(order, 'status', 'pending')}\n"
        f"Total: {getattr(order, 'total', '')}\n\n"
        f"We’ll notify you as your order progresses."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[to_email],
        fail_silently=True,
    )


def send_order_status_email(order, status, note="", changed_by=None):
    to_email = _safe_email(order)
    if not to_email:
        return

    order_no = getattr(order, "order_number", order.id)
    subject = f"Urban Cart — Order #{order_no} is now {status}"

    changer = ""
    if changed_by:
        # show email if available, else str()
        email = getattr(changed_by, "email", None)
        changer = f"\nUpdated by: {email or str(changed_by)}"

    note_line = f"\nNote: {note}" if note else ""

    message = (
        f"Your order status has been updated.\n\n"
        f"Order: #{order_no}\n"
        f"New status: {status}"
        f"{note_line}"
        f"{changer}\n\n"
        f"Thank you for shopping with Urban Cart."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[to_email],
        fail_silently=True,
    )
