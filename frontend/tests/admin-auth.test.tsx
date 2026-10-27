import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../src/auth/AuthContext";
import ProtectedAdminRoute from "../src/components/admin/ProtectedAdminRoute";
import AdminLoginPage from "../src/pages/admin/AdminLoginPage";

function renderAdmin(initialPath = "/admin") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<p>Protected dashboard</p>} />
          </Route>
          <Route path="/admin/login" element={<AdminLoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("admin authentication route", () => {
  it("redirects unauthenticated visitors to the login page", () => {
    renderAdmin();
    expect(screen.getByRole("heading", { name: "Sign in to your workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("signs in and stores the access token before entering the protected page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ accessToken: "test-access-token", expiresAt: "2099-01-01T00:00:00Z" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    renderAdmin("/admin/login");

    fireEvent.change(screen.getByLabelText("Admin email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
    expect(sessionStorage.getItem("immersive-menu-admin-token")).toBe("test-access-token");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      email: "admin@example.com",
      password: "correct-password",
    });
  });

  it("shows failed login errors without granting protected access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Invalid email or password" }),
      { status: 401, headers: { "Content-Type": "application/problem+json" } },
    )));
    renderAdmin("/admin/login");
    fireEvent.change(screen.getByLabelText("Admin email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    await waitFor(() => expect(sessionStorage.getItem("immersive-menu-admin-token")).toBeNull());
  });
});
