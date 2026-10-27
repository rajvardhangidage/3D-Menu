import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function AdminShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  function logout() {
    signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <NavLink to="/admin" className="admin-brand">
          <span className="admin-brand-mark">M</span>
          <span>menu<span className="brand-light">studio</span><small>PLATFORM ADMIN</small></span>
        </NavLink>
        <div className="sidebar-label">WORKSPACE</div>
        <NavLink to="/admin" end className={({ isActive }) => `sidebar-link${isActive ? " selected" : ""}`}>
          <span className="nav-icon">▦</span> Cafes
        </NavLink>
        <div className="sidebar-bottom">
          <div className="sidebar-admin">
            <div className="admin-avatar">A</div>
            <div><strong>Platform admin</strong><small>Administrator</small></div>
          </div>
          <button type="button" className="logout-button" onClick={logout}><span>↪</span> Sign out</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span className="topbar-status" /> Platform workspace</div>
          <span className="topbar-secure">SECURE ADMIN AREA</span>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}
