import { jwtDecode } from "jwt-decode";
import { authStorage } from "./authStorage";

export function getJwtPayload() {
  const token = authStorage.getAccess();
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function isTokenValid(payload) {
  // exp is seconds since epoch
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

export function isAdmin(payload) {
  return Boolean(payload?.is_staff || payload?.is_superuser);
}
