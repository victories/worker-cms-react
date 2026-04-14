import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerPostTools(server: McpServer, client: ApiClient) {
  server.registerTool("cms_list_posts", {
    title: "List Posts",
    description: "List posts/pages from the CMS. Supports filtering by status, type, language.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      status: z.enum(["publish", "draft", "pending", "trash", "scheduled"]).optional().describe("Filter by status"),
      post_type: z.enum(["post", "page"]).optional().describe("Filter by type (post or page)"),
      language: z.string().optional().describe("Filter by language code (e.g. 'tr', 'en')"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      per_page: z.number().int().min(1).max(100).default(20).describe("Items per page"),
      search: z.string().optional().describe("Search in title/content"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const queryParams: Record<string, string> = {};
    if (params.status) queryParams.status = params.status;
    if (params.post_type) queryParams.post_type = params.post_type;
    if (params.language) queryParams.language = params.language;
    if (params.search) queryParams.search = params.search;
    queryParams.page = String(params.page);
    queryParams.per_page = String(params.per_page);

    const data = await client.request('/posts', { params: queryParams, siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_get_post", {
    title: "Get Post",
    description: "Get a single post/page by ID with full content and metadata.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Post ID"),
    },
    annotations: { readOnlyHint: true },
  }, async (params) => {
    const data = await client.request(`/posts/${params.id}`, { siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_create_post", {
    title: "Create Post",
    description: "Create a new post or page.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      title: z.string().describe("Post title"),
      content: z.string().describe("Post content (HTML)"),
      status: z.enum(["publish", "draft", "pending", "scheduled"]).default("draft").describe("Post status"),
      post_type: z.enum(["post", "page"]).default("post").describe("Content type"),
      excerpt: z.string().optional().describe("Post excerpt"),
      slug: z.string().optional().describe("URL slug (auto-generated if omitted)"),
      language: z.string().optional().describe("Language code"),
      featured_image: z.string().optional().describe("Featured image URL or R2 key"),
      category_ids: z.array(z.number()).optional().describe("Category IDs to assign"),
      tag_ids: z.array(z.number()).optional().describe("Tag IDs to assign"),
      seo_title: z.string().optional().describe("SEO meta title"),
      seo_description: z.string().optional().describe("SEO meta description"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (params) => {
    const { site_id, ...body } = params;
    const data = await client.request('/posts', { method: 'POST', body, siteId: site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_update_post", {
    title: "Update Post",
    description: "Update an existing post/page. Only provide fields you want to change.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Post ID to update"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content (HTML)"),
      status: z.enum(["publish", "draft", "pending", "trash", "scheduled"]).optional().describe("New status"),
      excerpt: z.string().optional().describe("New excerpt"),
      slug: z.string().optional().describe("New URL slug"),
      featured_image: z.string().optional().describe("New featured image"),
      seo_title: z.string().optional().describe("New SEO title"),
      seo_description: z.string().optional().describe("New SEO description"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (params) => {
    const { site_id, id, ...body } = params;
    const data = await client.request(`/posts/${id}`, { method: 'PUT', body, siteId: site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool("cms_delete_post", {
    title: "Delete Post",
    description: "Move a post to trash.",
    inputSchema: {
      site_id: z.number().int().optional().describe("Site ID (use cms_list_sites to find IDs). Required for site-scoped operations."),
      id: z.number().int().describe("Post ID to delete"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async (params) => {
    const data = await client.request(`/posts/${params.id}`, { method: 'DELETE', siteId: params.site_id });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  });
}
