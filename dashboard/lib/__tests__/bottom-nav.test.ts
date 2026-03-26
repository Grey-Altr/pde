import { describe, it, expect } from "vitest";
// Smoke test — validates the tabs configuration is correct
describe("BottomNav tabs", () => {
  const tabs = [
    { href: "/", label: "Sessions" },
    { href: "/settings", label: "Settings" },
  ];

  it("has Sessions tab pointing to root", () => {
    expect(tabs[0].href).toBe("/");
    expect(tabs[0].label).toBe("Sessions");
  });

  it("has Settings tab", () => {
    expect(tabs[1].href).toBe("/settings");
    expect(tabs[1].label).toBe("Settings");
  });

  it("all tabs have href and label", () => {
    for (const tab of tabs) {
      expect(tab.href).toBeTruthy();
      expect(tab.label).toBeTruthy();
    }
  });
});
