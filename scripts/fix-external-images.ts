/**
 * One-time script: Fix external images in post content
 * Run via: wrangler d1 execute ... or manually trigger via API
 *
 * This is a reference - the actual fix is done via the API endpoint below
 */

// We'll add a temporary admin endpoint to fix this
// POST /api/posts/:id/fix-images
// It will re-run processContentImages on the post's content
