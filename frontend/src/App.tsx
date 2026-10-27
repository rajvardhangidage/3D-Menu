import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AdminShell from "./components/admin/AdminShell";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import CafeDetailsPage from "./pages/admin/CafeDetailsPage";
import CafeFormPage from "./pages/admin/CafeFormPage";
import CafeListPage from "./pages/admin/CafeListPage";
import CafeExperiencePage from "./pages/CafeExperiencePage";
import "./styles/admin.css";
import "./styles/customer-experience.css";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/cafe/:slug" element={<CafeExperiencePage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<CafeListPage />} />
            <Route path="cafes/new" element={<CafeFormPage />} />
            <Route path="cafes/:cafeId" element={<CafeDetailsPage />} />
            <Route path="cafes/:cafeId/edit" element={<CafeFormPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
