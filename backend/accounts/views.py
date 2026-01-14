from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .tokens import CustomPasswordResetTokenGenerator
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()
reset_token_generator = CustomPasswordResetTokenGenerator()


def _pad_b64(s: str) -> str:
    s = s or ""
    return s + ("=" * (-len(s) % 4))


def _qp_cleanup(s: str) -> str:
    if not s:
        return ""
    s = str(s)
    s = s.replace("=\r\n", "").replace("=\n", "")
    s = s.replace("=3D", "=").replace("=3d", "=")
    s = s.strip()
    if s.startswith("3D") or s.startswith("3d"):
        s = s[2:]
    s = s.rstrip("=")
    return s


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    permission_classes = [AllowAny]  # ✅ keep login public


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = (serializer.validated_data.get("email") or "").strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "If this email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = reset_token_generator.make_token(user)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}"

        # ✅ Dev: copy-safe print
        print("\nRESET LINK (copy this):", reset_link, "\n")

        subject = "Reset your Urban Cart password"

        html_message = f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Password Reset</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,0.06);overflow:hidden;">
        <div style="padding:18px 22px;background:#0f172a;color:#ffffff;">
          <div style="font-size:16px;font-weight:700;letter-spacing:.3px;">Urban Cart</div>
          <div style="font-size:12px;opacity:.9;margin-top:2px;">Password reset request</div>
        </div>

        <div style="padding:22px;color:#0f172a;">
          <h2 style="margin:0 0 10px;font-size:18px;">Reset your password</h2>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">
            We received a request to reset your Urban Cart password. Click the button below to set a new password.
          </p>

          <div style="margin:18px 0;">
            <a href="{reset_link}"
               style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;
                      padding:12px 16px;border-radius:12px;font-size:14px;font-weight:700;">
              Reset Password
            </a>
          </div>

          <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#64748b;">
            If the button doesn’t work, copy and paste this link into your browser:
          </p>

          <p style="margin:0 0 16px;font-size:12px;line-height:1.6;word-break:break-all;">
            <a href="{reset_link}" style="color:#0ea5e9;text-decoration:underline;">{reset_link}</a>
          </p>

          <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
              If you didn’t request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>

      <p style="margin:14px 0 0;text-align:center;font-size:11px;color:#94a3b8;">
        © {getattr(settings, "SITE_NAME", "Urban Cart")} • This is an automated message
      </p>
    </div>
  </body>
</html>
"""
        text_message = strip_tags(html_message)

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send()
        except Exception as e:
            # ✅ Don't break UX / avoid user enumeration
            print("FORGOT PASSWORD EMAIL ERROR:", repr(e))
            return Response(
                {"detail": "If this email exists, a reset link has been sent."},
                status=status.HTTP_200_OK,
            )

        if getattr(settings, "DEBUG", False):
            ok_custom = reset_token_generator.check_token(user, token)
            ok_default = default_token_generator.check_token(user, token)
            return Response(
                {
                    "detail": "DEV: reset link generated.",
                    "uid": uid,
                    "token": token,
                    "reset_link": reset_link,
                    "check": {"custom": ok_custom, "default": ok_default},
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "If this email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = _qp_cleanup(serializer.validated_data.get("uid") or "")
        token = _qp_cleanup(serializer.validated_data.get("token") or "")
        new_password = serializer.validated_data.get("new_password")

        print("DEBUG RESET SECRET_KEY prefix:", str(getattr(settings, "SECRET_KEY", ""))[:12])
        print("DEBUG RESET uid repr:", repr(uid))
        print("DEBUG RESET token repr:", repr(token))

        try:
            uid_int = force_str(urlsafe_base64_decode(_pad_b64(uid)))
            user = User.objects.get(pk=uid_int)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            print("DEBUG RESET ERROR: UID decode or user lookup failed")
            return Response({"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        ok_custom = reset_token_generator.check_token(user, token)
        ok_default = default_token_generator.check_token(user, token)

        print("DEBUG RESET user.pk:", user.pk)
        print("DEBUG RESET check(custom):", ok_custom)
        print("DEBUG RESET check(default):", ok_default)

        if not (ok_custom or ok_default):
            print("DEBUG RESET ERROR: token check failed")
            return Response(
                {"detail": "Reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        print("DEBUG RESET SUCCESS: password reset")
        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)
