import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const workflowsDir = path.resolve(__dirname, "../../../workflows");

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(workflowsDir, name), "utf-8");
}

describe("workflow --webmcp flag: wireframe.md", () => {
  const content = readWorkflow("wireframe.md");

  it("contains --webmcp in flags table", () => {
    expect(content).toContain("| `--webmcp`");
  });

  it("contains USE_WEBMCP variable set", () => {
    expect(content).toContain("USE_WEBMCP");
  });

  it("contains ## WebMCP Context conditional section", () => {
    expect(content).toContain("## WebMCP Context");
  });

  it("contains pde_approval_gate in WebMCP Context section", () => {
    expect(content).toContain("pde_approval_gate");
  });
});

describe("workflow --webmcp flag: mockup.md", () => {
  const content = readWorkflow("mockup.md");

  it("contains --webmcp in flags table", () => {
    expect(content).toContain("| `--webmcp`");
  });

  it("contains USE_WEBMCP variable set", () => {
    expect(content).toContain("USE_WEBMCP");
  });

  it("contains ## WebMCP Context conditional section", () => {
    expect(content).toContain("## WebMCP Context");
  });

  it("contains pde_approval_gate in WebMCP Context section", () => {
    expect(content).toContain("pde_approval_gate");
  });
});

describe("workflow --webmcp flag: critique.md", () => {
  const content = readWorkflow("critique.md");

  it("contains --webmcp in flags table", () => {
    expect(content).toContain("| `--webmcp`");
  });

  it("contains USE_WEBMCP variable set", () => {
    expect(content).toContain("USE_WEBMCP");
  });

  it("contains ## WebMCP Context conditional section", () => {
    expect(content).toContain("## WebMCP Context");
  });

  it("contains pde_approval_gate in WebMCP Context section", () => {
    expect(content).toContain("pde_approval_gate");
  });
});

describe("workflow --webmcp flag: competitive.md", () => {
  const content = readWorkflow("competitive.md");

  it("contains --webmcp in flags table", () => {
    expect(content).toContain("| `--webmcp`");
  });

  it("contains USE_WEBMCP variable set", () => {
    expect(content).toContain("USE_WEBMCP");
  });

  it("contains ## WebMCP Context conditional section", () => {
    expect(content).toContain("## WebMCP Context");
  });

  it("contains pde_approval_gate in WebMCP Context section", () => {
    expect(content).toContain("pde_approval_gate");
  });
});
