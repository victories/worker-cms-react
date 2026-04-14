import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerCommentTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_comments", {
    title: "List Comments",
    description: "List comments with optional status filter.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      status: z.enum(["pending", "approved", "spam", "trash"]).optional().describe("Filter by status"),
      post_id: z.number().optional().describe("Filter by post ID"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const queryParams: Record<string, string> = { page: String(params.page) };
    if (params.status) queryParams.status = params.status;
    if (params.post_id) queryParams.post_id = String(params.post_id);
    const data = await client.request('/comments', { params: queryParams, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_moderate_comment", {
    title: "Moderate Comment",
    description: "Approve, spam, or trash a comment.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Comment ID"),
      status: z.enum(["approved", "spam", "trash"]).describe("New status"),
    },
    annotations: { readOnlyHint: false },
  }, async (params) => {
    const data = await client.request(`/comments/${params.id}`, {
      method: 'PUT',
      body: { status: params.status },
      siteId: params.site_id,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
