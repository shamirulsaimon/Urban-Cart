from rest_framework.permissions import BasePermission


class RequireAuth(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class RequireAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or u.is_superuser))


class RequireVendor(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False

        # ✅ Allow admins to access vendor endpoints (useful for testing)
        if getattr(u, "is_staff", False) or getattr(u, "is_superuser", False):
            return True

        role = (getattr(u, "role", "") or "").strip().lower()
        return role == "vendor"
