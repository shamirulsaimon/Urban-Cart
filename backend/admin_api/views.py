from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


def _is_admin(user):
    # Works with different user models (is_staff / is_superuser / is_admin flag)
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "is_admin", False)
    )


class AdminMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_admin(request.user):
            return Response({"detail": "Admin only."}, status=403)

        u = request.user
        return Response(
            {
                "id": u.id,
                "email": getattr(u, "email", None),
                "name": (
                    getattr(u, "get_full_name", lambda: "")()  # if Django User
                    or getattr(u, "name", None)
                    or getattr(u, "username", None)
                ),
                "isAdmin": True,
            }
        )


class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_admin(request.user):
            return Response({"detail": "Admin only."}, status=403)

        # IMPORTANT: Order/OrderItem are in the orders app, NOT admin_api.models
        from orders.models import Order

        qs = Order.objects.all()

        total_orders = qs.count()
        delivered_orders = qs.filter(status=Order.Status.DELIVERED).count()
        pending_orders = qs.filter(status=Order.Status.PENDING).count()

        # Your Order model field is "total" (NOT total_amount)
        revenue = (
            qs.filter(status=Order.Status.DELIVERED).aggregate(s=Sum("total"))["s"] or 0
        )

        return Response(
            {
                "totalOrders": total_orders,
                "deliveredOrders": delivered_orders,
                "pendingOrders": pending_orders,
                "revenue": revenue,
            }
        )
