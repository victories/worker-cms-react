import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerTaxonomyTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_taxonomies", {
    title: "List Taxonomies",
    description: "List categories and tags.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      type: z.enum(["category", "tag"]).optional().describe("Filter by taxonomy type"),
      language: z.string().optional().describe("Filter by language"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const queryParams: Record<string, string> = {};
    if (params.type) queryParams.type = params.type;
    if (params.language) queryParams.language = params.language;
    const data = await client.request('/taxonomies', { params: queryParams, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_create_taxonomy", {
    title: "Create Category/Tag",
    description: "Create a new category or tag.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      name: z.string().describe("Taxonomy name"),
      slug: z.string().optional().describe("URL slug"),
      type: z.enum(["category", "tag"]).default("category").describe("Taxonomy type"),
      description: z.string().optional().describe("Description"),
      parent_id: z.number().optional().describe("Parent category ID (for hierarchical)"),
      language: z.string().optional().describe("Language code"),
    },
    annotations: { readOnlyHint: false },
  }, async (params) => {
    const { site_id, ...body } = params;
    const data = await client.request('/taxonomies', { method: 'POST', body, siteId: site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
