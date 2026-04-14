import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerMediaTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_media", {
    title: "List Media",
    description: "List media files from the CMS media library.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z.number().int().min(1).max(100).default(20).describe("Items per page"),
      search: z.string().optional().describe("Search by filename"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const queryParams: Record<string, string> = {
      page: String(params.page),
      per_page: String(params.per_page),
    };
    if (params.search) queryParams.search = params.search;
    const data = await client.request('/media', { params: queryParams, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_delete_media", {
    title: "Delete Media",
    description: "Delete a media file from the library.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Media ID to delete"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async (params) => {
    const data = await client.request(`/media/${params.id}`, { method: 'DELETE', siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
