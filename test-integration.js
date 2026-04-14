// Integration test for WP-CMS Phase 1
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

async function api(method, path, body, headers = {}) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json.data;
}

async function run() {
  console.log('\n=== WP-CMS Phase 1 Integration Tests ===\n');

  // 1. Setup
  const setupData = await test('Setup: create super admin', () =>
    api('POST', '/api/auth/setup', {
      email: 'admin@test.com',
      password: 'Admin123!',
      display_name: 'Test Admin'
    })
  );

  // 2. Login
  let token = null;
  const loginData = await test('Auth: login', () =>
    api('POST', '/api/auth/login', {
      email: 'admin@test.com',
      password: 'Admin123!'
    })
  );
  if (loginData) {
    token = loginData.access_token;
    if (!token) throw new Error('No access token');
  }

  const auth = { Authorization: `Bearer ${token}` };
  const siteAuth = { ...auth, 'X-Site-Id': '1' };

  // 3. Verify login response shape
  await test('Auth: login returns user and sites', () => {
    if (!loginData.user) throw new Error('No user in response');
    if (!loginData.sites) throw new Error('No sites in response');
    if (loginData.user.role !== 'super_admin') throw new Error('Wrong role');
    return loginData;
  });

  // 4. Refresh token
  if (loginData?.refresh_token) {
    await test('Auth: refresh token', () =>
      api('POST', '/api/auth/refresh', { refresh_token: loginData.refresh_token })
    );
  }

  // 5. List sites
  const sites = await test('Sites: list', async () => {
    const res = await fetch(`${BASE}/api/sites`, { headers: auth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (!json.data || json.data.length === 0) throw new Error('No sites');
    return json.data;
  });

  // 6. Create new site
  const newSite = await test('Sites: create', () =>
    api('POST', '/api/sites', {
      name: 'Test Blog',
      slug: 'test-blog',
      description: 'A test blog site',
      default_language: 'en'
    }, auth)
  );

  // 7. Add domain to new site
  if (newSite?.id) {
    await test('Sites: add domain', () =>
      api('POST', `/api/sites/${newSite.id}/domains`, {
        domain: 'test-blog.local',
        is_primary: true
      }, auth)
    );
  }

  // 8. Get site detail
  if (newSite?.id) {
    await test('Sites: get detail', async () => {
      const res = await fetch(`${BASE}/api/sites/${newSite.id}`, { headers: auth });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (json.data.name !== 'Test Blog') throw new Error('Wrong name');
      return json.data;
    });
  }

  // 9. Create post
  const newPost = await test('Posts: create', () =>
    api('POST', '/api/posts', {
      title: 'Merhaba Dünya',
      content: '<p>Bu ilk test yazımız!</p>',
      status: 'published',
      post_type: 'post',
      language: 'tr'
    }, siteAuth)
  );

  // 10. Create second post (draft)
  const draftPost = await test('Posts: create draft', () =>
    api('POST', '/api/posts', {
      title: 'Draft Post',
      content: '<p>This is a draft</p>',
      status: 'draft',
      post_type: 'post',
      language: 'en'
    }, siteAuth)
  );

  // 11. List posts
  await test('Posts: list', async () => {
    const res = await fetch(`${BASE}/api/posts`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (json.data.length < 1) throw new Error('No posts');
    return json.data;
  });

  // 12. Get single post
  if (newPost?.id) {
    await test('Posts: get single', async () => {
      const res = await fetch(`${BASE}/api/posts/${newPost.id}`, { headers: siteAuth });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (json.data.title !== 'Merhaba Dünya') throw new Error('Wrong title');
      return json.data;
    });
  }

  // 13. Update post
  if (newPost?.id) {
    await test('Posts: update', async () => {
      const res = await fetch(`${BASE}/api/posts/${newPost.id}`, {
        method: 'PUT',
        headers: { ...siteAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', content: '<p>Updated content</p>' })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    });
  }

  // 14. Create taxonomy
  const newTax = await test('Taxonomies: create category', () =>
    api('POST', '/api/taxonomies', {
      name: 'Teknoloji',
      slug: 'teknoloji',
      type: 'category',
      language: 'tr'
    }, siteAuth)
  );

  // 15. Create tag
  await test('Taxonomies: create tag', () =>
    api('POST', '/api/taxonomies', {
      name: 'javascript',
      slug: 'javascript',
      type: 'tag',
      language: 'en'
    }, siteAuth)
  );

  // 16. List taxonomies
  await test('Taxonomies: list categories', async () => {
    const res = await fetch(`${BASE}/api/taxonomies?type=category`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  });

  // 17. Get settings
  await test('Settings: get', async () => {
    const res = await fetch(`${BASE}/api/settings`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (!json.data.site_title) throw new Error('No site_title');
    return json.data;
  });

  // 18. Update settings
  await test('Settings: update', () =>
    api('PUT', '/api/settings', {
      site_title: 'Updated Title',
      posts_per_page: '15'
    }, siteAuth)
  );

  // 19. Analytics overview
  await test('Analytics: overview', async () => {
    const res = await fetch(`${BASE}/api/analytics/overview`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  });

  // 20. List menus
  await test('Menus: list', async () => {
    const res = await fetch(`${BASE}/api/menus`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  });

  // 21. List comments
  await test('Comments: list', async () => {
    const res = await fetch(`${BASE}/api/comments`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  });

  // 22. List users
  await test('Users: list', async () => {
    const res = await fetch(`${BASE}/api/users`, { headers: siteAuth });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (json.data.length < 1) throw new Error('No users');
    return json.data;
  });

  // 23. Public home page
  await test('Public: home page renders', async () => {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();
    if (!html.includes('WP-CMS')) throw new Error('No WP-CMS in HTML');
    return true;
  });

  // 24. Delete post
  if (draftPost?.id) {
    await test('Posts: delete', async () => {
      const res = await fetch(`${BASE}/api/posts/${draftPost.id}`, {
        method: 'DELETE',
        headers: siteAuth
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return true;
    });
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
