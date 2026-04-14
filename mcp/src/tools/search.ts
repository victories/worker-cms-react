import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerSearchTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_search", {
    title: "Search Content",
    description: "Full-text search across posts and pages using FTS5 engine with BM25 ranking.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      query: z.string().min(1).describe("Search query"),
      language: z.string().optional().describe("Filter by language code"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z.number().int().min(1).max(50).default(10).describe("Results per page"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const queryParams: Record<string, string> = {
      search: params.query,
      page: String(params.page),
      per_page: String(params.per_page),
    };
    if (params.language) queryParams.language = params.language;
    const data = await client.request('/posts', { params: queryParams, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
