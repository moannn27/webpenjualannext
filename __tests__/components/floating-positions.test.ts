import { describe, expect, it } from "vitest";
import { getFloatingControlBottom } from "@/components/layouts/floating-positions";

describe("mobile floating control offsets", () => {
  it("preserves current positions when there is no bottom bar", () => {
    expect(getFloatingControlBottom(false, "chat")).toBe("bottom-5");
    expect(getFloatingControlBottom(false, "back-to-top")).toBe("bottom-22");
  });

  it("places chat above the measured cart bar with safe-area and consistent spacing", () => {
    expect(getFloatingControlBottom(true, "chat")).toBe(
      "bottom-[calc(68px_+_env(safe-area-inset-bottom)_+_0.75rem)]"
    );
  });

  it("keeps back-to-top above the launcher when a bottom bar is visible", () => {
    expect(getFloatingControlBottom(true, "back-to-top")).toBe(
      "bottom-[calc(68px_+_env(safe-area-inset-bottom)_+_0.75rem_+_3.5rem_+_0.75rem)]"
    );
  });
});
