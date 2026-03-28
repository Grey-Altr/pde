'use client';
import { useDesignStateTool, useProjectInfoTool, useArtifactListTool, useApprovalGateTool, useCompetitorTools } from '@/lib/mcp/browser-tools';

/**
 * Composite hook that registers all PDE WebMCP browser tools.
 * Call this once in a mounted client component to make all tools available
 * to browser AI agents via navigator.modelContext.
 */
export function useWebMcpTools() {
  useDesignStateTool();
  useProjectInfoTool();
  useArtifactListTool();
  useApprovalGateTool();
  useCompetitorTools();
}
