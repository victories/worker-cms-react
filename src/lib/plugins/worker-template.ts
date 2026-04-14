export const PLUGIN_WORKER_TEMPLATE = `
// Plugin Worker Template - runs in isolated V8 isolate
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

async function handleHook(hook, args, settings) {
  switch (hook) {
    case 'post.beforeRender':
      return processContent(args[0], args[1], settings);
    case 'page.head':
      return injectHead(args[0], args[1], settings);
    case 'page.bodyEnd':
      return injectBodyEnd(args[0], args[1], settings);
    case 'post.afterSave':
      await onPostSaved(args[0], settings);
      return null;
    default:
      return args[0]; // passthrough
  }
}

// ===== Implement your plugin logic below =====

function processContent(html, post, settings) {
  return html;
}

function injectHead(html, site, settings) {
  return html;
}

function injectBodyEnd(html, site, settings) {
  return html;
}

async function onPostSaved(post, settings) {
  // fire-and-forget side effects
}
`;
