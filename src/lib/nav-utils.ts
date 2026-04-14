// ─── Nav Tree Builder ─────────────────────────────────
// Converts flat menu_items (with parent_id) into nested NavItem tree
// Used by all public routes to build hierarchical navigation

export interface NavItem {
  title: string;
  url: string;
  target?: string;
  children?: NavItem[];
}

export function buildNavTree(items: any[]): NavItem[] {
  if (!items || items.length === 0) return [];

  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Build id -> node map
  const nodeMap = new Map<number, { item: any; children: any[] }>();
  for (const item of sorted) {
    nodeMap.set(item.id, { item, children: [] });
  }

  const roots: any[] = [];

  for (const item of sorted) {
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)!.children.push(nodeMap.get(item.id)!);
    } else {
      roots.push(nodeMap.get(item.id)!);
    }
  }

  function toNavItem(node: { item: any; children: any[] }): NavItem {
    const result: NavItem = {
      title: node.item.title,
      url: node.item.url || '#',
    };
    if (node.item.target && node.item.target !== '_self') {
      result.target = node.item.target;
    }
    if (node.children.length > 0) {
      result.children = node.children.map(toNavItem);
    }
    return result;
  }

  return roots.map(toNavItem);
}
