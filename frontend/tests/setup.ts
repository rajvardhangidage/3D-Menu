import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
