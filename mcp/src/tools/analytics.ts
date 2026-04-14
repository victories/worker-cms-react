import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerAnalyticsTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_analytics_overview", {
    title: "Analytics Overview",
    description: "Get site analytics overview: total views, today views, post/page/comment/media counts.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/analytics/overview', { siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_analytics_views", {
    title: "Analytics Views",
    description: "Get daily page view trends for a time range.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      days: z.number().int().min(1).max(365).default(30).describe("Number of days to look back"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/analytics/views', { params: { days: String(params.days) }, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_analytics_popular", {
    title: "Popular Pages",
    description: "Get most visited pages in a time range.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      days: z.number().int().min(1).max(365).default(30).describe("Number of days"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/analytics/popular', { params: { days: String(params.days) }, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_analytics_referrers", {
    title: "Top Referrers",
    description: "Get top traffic referrer sources.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      days: z.number().int().min(1).max(365).default(30).describe("Number of days"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request('/analytics/referrers', { params: { days: String(params.days) }, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
