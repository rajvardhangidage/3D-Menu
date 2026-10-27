import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CafeExperiencePage from "../src/pages/CafeExperiencePage";
import type { CafeMenu } from "../src/api/types";

vi.mock("../src/components/SpatialAtmosphere", () => ({ default: () => <div data-testid="spatial-atmosphere" /> }));

const menu: CafeMenu = {
  id: "cafe-id",
  name: "Cafe Aroma",
  slug: "cafe-aroma",
  logoUrl: null,
  description: "Seasonal dishes",
  address: "12 Garden Street",
  phone: null,
  currencyCode: "USD",
  categories: [
    {
      id: "mains",
      name: "Mains",
      displayOrder: 0,
      items: [
        { id: "dish", name: "Garden pasta", description: "Fresh herbs", imageUrl: null, halfPrice: 8, fullPrice: 14, available: true, displayOrder: 0 },
        { id: "hidden", name: "Unavailable dish", description: null, imageUrl: null, halfPrice: null, fullPrice: 9, available: false, displayOrder: 1 },
      ],
    },
    {
      id: "drinks",
      name: "Drinks",
      displayOrder: 1,
      items: [
        { id: "tea", name: "Mint tea", description: null, imageUrl: null, halfPrice: null, fullPrice: 4, available: true, displayOrder: 0 },
      ],
    },
  ],
};

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={["/cafe/cafe-aroma"]}>
      <Routes><Route path="/cafe/:slug" element={<CafeExperiencePage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(menu), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })));
});

describe("public customer menu flow", () => {
  it("loads the welcome screen, lets guests choose a category, and shows item details with both prices", async () => {
    renderMenu();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Welcome to\s*Cafe Aroma/);
    fireEvent.click(screen.getByRole("button", { name: /Explore the menu/ }));

    expect(await screen.findByRole("heading", { name: "Garden pasta" })).toBeInTheDocument();
    expect(screen.queryByText("Unavailable dish")).not.toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
    expect(screen.getByText("$14.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Drinks/ }));
    expect(await screen.findByRole("heading", { name: "Mint tea" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Mint tea details" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Mint tea");
    expect(screen.getByRole("dialog")).toHaveTextContent("$4.00");
  });

  it("shows an empty category message and tolerates missing cafe branding and item images", async () => {
    const emptyMenu = { ...menu, logoUrl: null, categories: [{ id: "empty", name: "Quiet", displayOrder: 0, items: [] }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyMenu), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    renderMenu();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Welcome to\s*Cafe Aroma/);
    fireEvent.click(screen.getByRole("button", { name: /Explore the menu/ }));
    expect(await screen.findByText("No available items in this section right now.")).toBeInTheDocument();
  });

  it("shows a recoverable public API error and retries the request", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify(menu), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    renderMenu();

    expect(await screen.findByText("network unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Welcome to\s*Cafe Aroma/);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
