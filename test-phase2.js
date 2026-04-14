// Phase 2 Integration tests: WordPress Import + Backup
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:8787';
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
    return result;
  } catch (err) {
    console.log(`  [FAIL] ${name}: ${err.message}`);
    failed++;
    return null;
  }
}

async function run() {
  console.log('\n=== WP-CMS Phase 2 Integration Tests ===\n');

  // Setup + Login
  await fetch(`${BASE}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin123!', display_name: 'Test Admin' })
  });

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Admin123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.access_token;
  const auth = { Authorization: `Bearer ${token}` };
  const siteAuth = { ...auth, 'X-Site-Id': '1' };

  console.log('  [OK] Logged in\n');

  // Read WXR test file
  const wxrXml = fs.readFileSync(path.join(__dirname, 'test-wxr.xml'), 'utf-8');

  // 1. Preview WordPress import
  const preview = await test('Import: preview WXR', async () => {
    const res = await fetch(`${BASE}/api/import/wordpress/preview`, {
      method: 'POST',
      headers: { ...siteAuth, 'Content-Type': 'application/xml' },
      body: wxrXml
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (json.data.items_total !== 4) throw new Error(`Expected 4 items, got ${json.data.items_total}`);
    if (json.data.categories !== 2) throw new Error(`Expected 2 categories, got ${json.data.categories}`);
    if (json.data.tags !== 2) throw new Error(`Expected 2 tags, got ${json.data.tags}`);
    return json.data;
  });

  if (preview) {
    await test('Import: preview has correct types', () => {
      if (preview.items_by_type.post !== 3) throw new Error(`Expected 3 posts, got ${preview.items_by_type.post}`);
      if (preview.items_by_type.page !== 1) throw new Error(`Expected 1 page, got ${preview.items_by_type.page}`);
      return preview;
    });
  }

  // 2. Execute WordPress import
  const importResult = await test('Import: execute WXR import', async () => {
    const res = await fetch(`${BASE}/api/import/wordpress?language=tr`, {
      method: 'POST',
      headers: { ...siteAuth, 'Content-Type': 'application/xml' },
      body: wxrXml
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  });

  if (importResult) {
    await test('Import: categories imported', () => {
      if (importResult.result.categories.imported < 1) throw new Error('No categories imported');
      return true;
    });

    await test('Import: tags imported', () => {
      if (importResult.result.tags.imported < 1) throw new Error('No tags imported');
      return true;
    });

    await test('Import: posts imported', () => {
      if (importResult.result.posts.imported < 2) throw new Error(`Only ${importResult.result.posts.imported} posts imported`);
      return true;
    });

    await test('Import: pages imported', () => {
      if (importResult.result.pages.imported < 1) throw new Error('No pages imported');
      return true;
    });

    await test('Import: comments imported', () => {
      if (importResult.result.comments.imported < 1) throw new Error('No comments imported');
      return true;
    });

    await test('Import: source info correct', () => {
      if (importResult.source.title !== 'Test WordPress Blog') throw new Error('Wrong title');
      if (importResult.source.items_count !== 4) throw new Error('Wrong items count');
      return true;
    });
  }

  // 3. Verify imported posts are in the database
  await test('Verify: imported posts in list', async () => {
    const res = await fetch(`${BASE}/api/posts?per_page=50`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const titles = json.data.map(p => p.title);
    if (!titles.includes('İlk WordPress Yazısı')) throw new Error('First post not found');
    if (!titles.includes('Cloudflare Workers İncelemesi')) throw new Error('Second post not found');
    return json.data;
  });

  // 4. Verify imported categories
  await test('Verify: imported categories', async () => {
    const res = await fetch(`${BASE}/api/taxonomies?type=category`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const slugs = json.data.map(t => t.slug);
    if (!slugs.includes('haberler')) throw new Error('Haberler category not found');
    if (!slugs.includes('teknoloji')) throw new Error('Teknoloji category not found');
    return json.data;
  });

  // 5. Verify imported tags
  await test('Verify: imported tags', async () => {
    const res = await fetch(`${BASE}/api/taxonomies?type=tag`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const slugs = json.data.map(t => t.slug);
    if (!slugs.includes('javascript')) throw new Error('JavaScript tag not found');
    if (!slugs.includes('cloudflare')) throw new Error('Cloudflare tag not found');
    return json.data;
  });

  // 6. Verify imported comments
  await test('Verify: imported comments', async () => {
    const res = await fetch(`${BASE}/api/comments`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (json.data.length < 1) throw new Error('No comments found');
    const comment = json.data.find(c => c.author_name === 'Ziyaretçi');
    if (!comment) throw new Error('Imported comment not found');
    return json.data;
  });

  // 7. Backup/Export
  const backupData = await test('Backup: export site data', async () => {
    const res = await fetch(`${BASE}/api/backup/export`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (!json.data.posts) throw new Error('No posts in backup');
    if (!json.data.taxonomies) throw new Error('No taxonomies in backup');
    if (!json.data.settings) throw new Error('No settings in backup');
    return json.data;
  });

  if (backupData) {
    await test('Backup: contains all sections', () => {
      const sections = ['site', 'domains', 'posts', 'taxonomies', 'media', 'comments', 'menus', 'menu_items', 'settings', 'widgets', 'revisions'];
      for (const s of sections) {
        if (!(s in backupData)) throw new Error(`Missing section: ${s}`);
      }
      return true;
    });

    await test('Backup: posts match', () => {
      if (!Array.isArray(backupData.posts)) throw new Error('posts is not an array');
      if (backupData.posts.length < 2) throw new Error('Not enough posts in backup');
      return true;
    });
  }

  // 8. Selective backup
  await test('Backup: selective export (posts only)', async () => {
    const res = await fetch(`${BASE}/api/backup/export?sections=posts`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (!json.data.posts) throw new Error('No posts');
    if (json.data.menus) throw new Error('Should not have menus');
    return json.data;
  });

  // 9. Duplicate import (should skip)
  await test('Import: re-import skips duplicates', async () => {
    const res = await fetch(`${BASE}/api/import/wordpress?language=tr`, {
      method: 'POST',
      headers: { ...siteAuth, 'Content-Type': 'application/xml' },
      body: wxrXml
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    // All should be skipped (already imported)
    if (json.data.result.posts.skipped === 0 && json.data.result.pages.skipped === 0) {
      throw new Error('Expected some skipped items on re-import');
    }
    return json.data;
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
