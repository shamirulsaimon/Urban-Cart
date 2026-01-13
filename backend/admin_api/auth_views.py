from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model()

class UrbanCartTokenSerializer(TokenObtainPairSerializer):
    """
    Works with custom user models that may not have 'username'.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Safe identity fields
        token["user_id"] = user.pk
        token["email"] = getattr(user, "email", "") or ""

        # If your user has username, include it; otherwise fallback to email/local-part
        uname = getattr(user, "username", None)
        if uname:
            token["username"] = uname
        else:
            token["username"] = (getattr(user, "email", "") or "").split("@")[0]

        # Admin flags (for AdminRoute on React)
        token["is_staff"] = bool(getattr(user, "is_staff", False))
        token["is_superuser"] = bool(getattr(user, "is_superuser", False))

        return token


class UrbanCartTokenView(TokenObtainPairView):
    serializer_class = UrbanCartTokenSerializer
