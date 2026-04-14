import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerSiteTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_sites", {
    title: "List Sites",
    description: "List all sites managed by this CMS instance. Use the returned site IDs with other tools' site_id parameter.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  }, async () => {
    const data = await client.request('/sites');
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_get_site", {
    title: "Get Site Details",
    description: "Get detailed information about a specific site including domains, settings, and statistics.",
    inputSchema: {
      site_id: z.number().int().describe("Site ID"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request(`/sites/${params.site_id}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_create_site", {
    title: "Create Site",
    description: "Create a new site. Requires super_admin access.",
    inputSchema: {
      name: z.string().describe("Site name"),
      slug: z.string().optional().describe("URL slug (auto-generated if omitted)"),
      description: z.string().optional().describe("Site description"),
      domain: z.string().optional().describe("Primary domain for the site"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (params) => {
    const data = await client.request('/sites', { method: 'POST', body: params });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_delete_site", {
    title: "Delete Site",
    description: "Delete a site and all its content. WARNING: This is irreversible!",
    inputSchema: {
      site_id: z.number().int().describe("Site ID to delete"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async (params) => {
    const data = await client.request(`/sites/${params.site_id}`, { method: 'DELETE' });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
