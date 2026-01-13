import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getJwtPayload, isTokenValid, isAdmin } from "../auth/authUtils";

export default function AdminRoute() {
  const location = useLocation();

  const payload = getJwtPayload();
  const authed = payload && isTokenValid(payload);

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin(payload)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
