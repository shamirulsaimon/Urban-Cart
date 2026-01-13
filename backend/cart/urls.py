from django.urls import path   # ✅ THIS LINE WAS MISSING
from .views import (
    CartView,
    CartItemUpsertView,
    CartItemDeleteView,
    CartMergeView,
)

urlpatterns = [
    path("", CartView.as_view()),
    path("items/", CartItemUpsertView.as_view()),
    path("items/<int:id>/", CartItemDeleteView.as_view()),
    path("merge/", CartMergeView.as_view()),
    #path("api/", include("orders.urls")),
]
