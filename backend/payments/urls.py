from django.urls import path
from .views import (
    initiate_payment,
    sslcommerz_ipn,
    my_payments,
    admin_payments,
    demo_confirm,
    demo_fail,
    demo_cancel,
)

urlpatterns = [
    path("initiate/", initiate_payment),
    path("ipn/sslcommerz/", sslcommerz_ipn),
    path("my/", my_payments),
    path("admin/", admin_payments),

    # ✅ demo endpoints
    path("demo/confirm/", demo_confirm),
    path("demo/fail/", demo_fail),
    path("demo/cancel/", demo_cancel),
]
