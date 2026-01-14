from django.contrib.auth.tokens import PasswordResetTokenGenerator


class CustomPasswordResetTokenGenerator(PasswordResetTokenGenerator):
    """
    Same as Django's default, but does NOT depend on last_login.
    This prevents JWT logins from invalidating reset tokens.
    """

    def _make_hash_value(self, user, timestamp):
        email = getattr(user, "email", "") or ""
        return f"{user.pk}{user.password}{timestamp}{user.is_active}{email}"
