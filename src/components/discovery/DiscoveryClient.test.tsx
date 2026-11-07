// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryClient } from "./DiscoveryClient";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("DiscoveryClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ offices: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not request offices with fabricated coordinates when geolocation is denied", async () => {
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({
          code: 1,
          message: "Permission denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError);
      })
      .mockImplementationOnce((success: PositionCallback) => {
        success({
          coords: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now(),
          toJSON: () => ({})
        } as GeolocationPosition);
      });

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition }
    });

    render(<DiscoveryClient />);

    await screen.findByText("Search by district or capture location");
    expect(
      screen.getByText("Location access is blocked. You can still search by district, mandal, or village.")
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /find plants near me/i }));

    await screen.findByText("Live location active");
    expect(screen.getByText("13.0827, 80.2707")).toBeTruthy();

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("lat=");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("lat=13.0827");
  });

  it("submits district search without adding fake location coordinates", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
      error?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    });

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition }
    });

    render(<DiscoveryClient />);

    await screen.findByText("Search by district or capture location");

    fireEvent.change(screen.getByLabelText("district"), { target: { value: "NTR" } });
    fireEvent.submit(screen.getByRole("button", { name: /search/i }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("district=NTR");
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain("lat=");
  });
});
