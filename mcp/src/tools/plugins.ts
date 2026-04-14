import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerPluginTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_plugins", {
    title: "List Plugins",
    description: "List all available plugins with their activation status.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/plugins', { siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_toggle_plugin", {
    title: "Activate/Deactivate Plugin",
    description: "Toggle a plugin on or off for the current site.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Plugin ID"),
      action: z.enum(["activate", "deactivate"]).describe("Action to perform"),
    },
    annotations: { readOnlyHint: false },
  }, async (params) => {
    const data = await client.request(`/plugins/${params.id}/${params.action}`, { method: 'POST', siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_plugin_logs", {
    title: "Plugin Execution Logs",
    description: "Get execution logs and statistics for a plugin.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      slug: z.string().describe("Plugin slug"),
      days: z.number().int().min(1).max(30).default(7).describe("Number of days"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request(`/plugins/${params.slug}/logs`, { params: { days: String(params.days) }, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
