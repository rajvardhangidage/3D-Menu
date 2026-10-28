import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CafeExperiencePage from "../src/pages/CafeExperiencePage";
import type { CafeMenu } from "../src/api/types";

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
        { id: "burrata", name: "Garden burrata", description: null, imageUrl: null, halfPrice: null, fullPrice: 15, available: true, displayOrder: 2 },
        { id: "toast", name: "Wild mushroom toast", description: null, imageUrl: null, halfPrice: null, fullPrice: 14, available: true, displayOrder: 3 },
        { id: "risotto", name: "Wild mushroom risotto", description: "Slow-cooked rice", imageUrl: null, halfPrice: null, fullPrice: 16, available: true, displayOrder: 4 },
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
  it("shows a short cafe intro before the floating menu and supports browsing categories and dishes", async () => {
    renderMenu();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Cafe Aroma");
    expect(screen.getByText("A Culinary Journey")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /camera/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tap to explore menu/ }));

    expect(await screen.findByRole("heading", { name: "Mains" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Garden pasta" })).toBeInTheDocument();
    expect(screen.queryByText("Unavailable dish")).not.toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
    expect(screen.getByText("$14.00")).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Show Garden burrata" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Show Wild mushroom risotto" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Show Garden burrata" })[0]);
    expect(await screen.findByRole("heading", { name: "Garden burrata" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next menu item" }));
    expect(await screen.findByRole("heading", { name: "Wild mushroom toast" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Cafe Aroma");
    fireEvent.click(screen.getByRole("button", { name: /Tap to explore menu/ }));
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
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Cafe Aroma");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
