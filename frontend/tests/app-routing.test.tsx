import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

vi.mock("../src/pages/admin/CafeListPage", () => ({
  default: () => <h1>Protected cafe dashboard</h1>,
}));
vi.mock("../src/components/SpatialAtmosphere", () => ({
  default: () => <div data-testid="spatial-atmosphere" />,
}));

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("application routes", () => {
  it("redirects the root route to admin login", () => {
    renderApp("/");
    expect(screen.getByRole("heading", { name: "Sign in to your workspace" })).toBeInTheDocument();
  });

  it("keeps the explicit admin login route available", () => {
    renderApp("/admin/login");
    expect(screen.getByRole("heading", { name: "Sign in to your workspace" })).toBeInTheDocument();
  });

  it("redirects unauthenticated admin visits to login", () => {
    renderApp("/admin");
    expect(screen.getByRole("heading", { name: "Sign in to your workspace" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Protected cafe dashboard" })).not.toBeInTheDocument();
  });

  it("shows the protected dashboard for an authenticated admin", () => {
    sessionStorage.setItem("immersive-menu-admin-token", "test-token");
    renderApp("/admin");
    expect(screen.getByRole("heading", { name: "Protected cafe dashboard" })).toBeInTheDocument();
  });

  it("navigates to the protected dashboard after login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ accessToken: "test-access-token", expiresAt: "2099-01-01T00:00:00Z" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    renderApp("/admin/login");

    fireEvent.change(screen.getByLabelText("Admin email"), {
      target: { value: "admin@immersivemenu.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Admin@123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    expect(await screen.findByRole("heading", { name: "Protected cafe dashboard" })).toBeInTheDocument();
  });

  it("routes an invalid cafe slug to the customer menu error state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Active cafe not found" }),
      { status: 404, headers: { "Content-Type": "application/problem+json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/cafe/not-a-real-cafe");

    expect(await screen.findByRole("heading", { name: "This menu is out of reach." })).toBeInTheDocument();
    expect(screen.getByText("This menu is not available.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/public/cafes/not-a-real-cafe/menu"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
