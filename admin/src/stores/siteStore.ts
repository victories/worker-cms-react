import { create } from 'zustand';
import { api } from '@/lib/api';

interface Site {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  default_language: string;
  domains?: { id: number; domain: string; is_primary: number }[];
}

interface SiteState {
  sites: Site[];
  activeSite: Site | null;
  loading: boolean;
  fetchSites: () => Promise<void>;
  setActiveSite: (site: Site) => void;
  setActiveSiteById: (id: number) => void;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  sites: [],
  activeSite: null,
  loading: false,

  fetchSites: async () => {
    set({ loading: true });
    try {
      // Check user role to pick the right endpoint — avoids 403 on /sites for non-super_admin
      const userStr = localStorage.getItem('user');
      const userRole = userStr ? (JSON.parse(userStr) as any).role : null;

      let res: any;
      if (userRole === 'super_admin') {
        res = await api.getSites();
      } else {
        res = await api.request('/sites/my');
      }
      if (res?.success) {
        const sites = res.data;
        set({ sites, loading: false });

        // Restore active site from localStorage or pick first
        if (!get().activeSite && sites.length > 0) {
          const savedId = localStorage.getItem('active_site_id');
          const saved = savedId ? sites.find((s: Site) => s.id === Number(savedId)) : null;
          const site = saved || sites[0];
          api.setSiteId(site.id);
          localStorage.setItem('active_site_id', String(site.id));
          set({ activeSite: site });
        }
      }
    } catch {
      set({ loading: false });
    }
  },

  setActiveSite: (site) => {
    api.setSiteId(site.id);
    localStorage.setItem('active_site_id', String(site.id));
    set({ activeSite: site });
  },

  setActiveSiteById: (id) => {
    const site = get().sites.find((s) => s.id === id);
    if (site) {
      get().setActiveSite(site);
    }
  },
}));
