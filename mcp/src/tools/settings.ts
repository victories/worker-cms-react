import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerSettingsTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_get_settings", {
    title: "Get Site Settings",
    description: "Get all settings for a site.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/settings', { siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_update_settings", {
    title: "Update Site Settings",
    description: "Update site settings. Provide key-value pairs.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      settings: z.record(z.string(), z.any()).describe("Key-value pairs to update (e.g. {site_title: 'My Blog', posts_per_page: 10})"),
    },
    annotations: { readOnlyHint: false },
  }, async (params) => {
    const data = await client.request('/settings', { method: 'PUT', body: params.settings, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
