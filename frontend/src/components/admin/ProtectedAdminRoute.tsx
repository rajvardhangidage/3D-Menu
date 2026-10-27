import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ProtectedAdminRoute() {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return <Outlet />;
}
