import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  it("returns correct PWA metadata", () => {
    const m = manifest();
    expect(m.name).toBe("PDE Dashboard");
    expect(m.short_name).toBe("PDE");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
  });

  it("returns icons with required sizes", () => {
    const m = manifest();
    const sizes = m.icons?.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("returns correct theme colors", () => {
    const m = manifest();
    expect(m.background_color).toBe("#09090b");
    expect(m.theme_color).toBe("#09090b");
  });

  it("includes maskable icon", () => {
    const m = manifest();
    const maskable = m.icons?.find((i) => i.purpose === "maskable");
    expect(maskable).toBeDefined();
    expect(maskable?.sizes).toBe("512x512");
  });
});
