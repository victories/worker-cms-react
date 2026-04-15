export const PLUGIN_WORKER_TEMPLATE = `
// Plugin Worker Template — Plugin API v2
// Runs in an isolated V8 isolate via Workers for Platforms dispatch.
// Available: standard Web APIs, fetch (if permitted)
// NOT available: D1, R2, KV, or any main worker bindings

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { hook, args, settings } = await request.json();

    try {
      const result = await handleHook(hook, args, settings);
      return Response.json({ result });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Render hooks — args[0] is ALWAYS the running ReactNode[] list.
// The main worker hydrates nodes from a JSON-serialisable shape:
//   { type: 'html', html: '<p>...</p>' }      → dangerouslySetInnerHTML
//   { type: 'link', href: '...', rel: '...' } → <link />
//   { type: 'meta', name: '...', content: '...' }
//   { type: 'script', src: '...' | inline: '...' }
// Push the objects you want appended and return the array unchanged
// is a valid no-op.
// ─────────────────────────────────────────────────────────────

async function handleHook(hook, args, settings) {
  switch (hook) {
    // Document render hooks
    case 'ui.head':
      return uiHead(args[0], args[1], settings);
    case 'ui.bodyStart':
      return uiBodyStart(args[0], args[1], settings);
    case 'ui.bodyEnd':
      return uiBodyEnd(args[0], args[1], settings);

    // Site-scoped layout slots
    case 'ui.slot.headerRight':
    case 'ui.slot.sidebarTop':
    case 'ui.slot.sidebarBottom':
    case 'ui.slot.footerStart':
    case 'ui.slot.footerEnd':
      return uiSiteSlot(hook, args[0], args[1], settings);

    // Post-scoped layout slots
    case 'ui.slot.postHeader':
    case 'ui.slot.postFooter':
      return uiPostSlot(hook, args[0], args[1], settings);

    // Data hooks — fire-and-forget / passthrough
    case 'post.beforeSave':
      return onPostBeforeSave(args[0], settings);
    case 'post.afterSave':
      await onPostAfterSave(args[0], settings);
      return null;

    default:
      return args[0]; // passthrough
  }
}

// ===== Implement your plugin logic below =====

function uiHead(nodes, site, settings) {
  return nodes;
}

function uiBodyStart(nodes, site, settings) {
  return nodes;
}

function uiBodyEnd(nodes, site, settings) {
  return nodes;
}

function uiSiteSlot(hook, nodes, site, settings) {
  return nodes;
}

function uiPostSlot(hook, nodes, post, settings) {
  return nodes;
}

function onPostBeforeSave(post, settings) {
  return post;
}

async function onPostAfterSave(post, settings) {
  // fire-and-forget side effects
}
`;
