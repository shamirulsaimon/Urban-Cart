from rest_framework.views import APIView
from .permissions import RequireAdmin

class AdminBaseAPIView(APIView):
    """
    Any admin endpoint should inherit from this.
    Guarantees admin-only access for /api/admin/* views.
    """
    permission_classes = [RequireAdmin]
