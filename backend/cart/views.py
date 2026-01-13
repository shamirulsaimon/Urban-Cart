from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Cart, CartItem
from .serializers import CartSerializer


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemUpsertView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # body: { "productId": 1, "qty": 2 }
        product_id = request.data.get("productId")
        qty = int(request.data.get("qty", 1))

        if not product_id:
            return Response({"detail": "productId required"}, status=400)

        if qty < 1:
            qty = 1

        cart, _ = Cart.objects.get_or_create(user=request.user)

        item, _ = CartItem.objects.get_or_create(cart=cart, product_id=product_id)
        item.qty = qty
        item.save()

        cart.refresh_from_db()
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        CartItem.objects.filter(cart=cart, id=id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartMergeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        body:
        {
          "items": [{"productId": 1, "qty": 2}, ...]
        }
        """
        items = request.data.get("items", [])
        cart, _ = Cart.objects.get_or_create(user=request.user)

        for it in items:
            pid = it.get("productId")
            qty = int(it.get("qty", 1))

            if not pid:
                continue
            if qty < 1:
                qty = 1

            item, created = CartItem.objects.get_or_create(cart=cart, product_id=pid)
            item.qty = (item.qty or 0) + qty
            item.save()

        cart.refresh_from_db()
        return Response(CartSerializer(cart, context={"request": request}).data)
