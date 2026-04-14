#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiClient } from "./api-client.js";
import { registerPostTools } from "./tools/posts.js";
import { registerMediaTools } from "./tools/media.js";
import { registerTaxonomyTools } from "./tools/taxonomies.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerSettingsTools } from "./tools/settings.js";
import { registerPluginTools } from "./tools/plugins.js";
import { registerSearchTools } from "./tools/search.js";
import { registerSiteTools } from "./tools/sites.js";

const url = process.env.CMS_URL;
const token = process.env.CMS_TOKEN;

if (!url || !token) {
  console.error("Required: CMS_URL and CMS_TOKEN environment variables");
  console.error("CMS_URL = Your CMS base URL (e.g., https://workercms.com)");
  console.error("CMS_TOKEN = Super admin JWT token");
  process.exit(1);
}

const client = new ApiClient(url.replace(/\/$/, ''), token);

const server = new McpServer({
  name: "workercms-mcp-server",
  version: "1.0.0",
});

registerSiteTools(server, client);
registerPostTools(server, client);
registerMediaTools(server, client);
registerTaxonomyTools(server, client);
registerCommentTools(server, client);
registerAnalyticsTools(server, client);
registerSettingsTools(server, client);
registerPluginTools(server, client);
registerSearchTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
