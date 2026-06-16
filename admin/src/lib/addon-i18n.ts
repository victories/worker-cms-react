// Turkish labels for the seeded add-ons. Add-on name/description live in
// the DB in English; when the UI language is Turkish we override by the
// add-on `key`, falling back to the DB value for anything not listed
// (e.g. add-ons the admin creates later).
type AddonText = { name: string; description: string };

const ADDON_TR: Record<string, AddonText> = {
  'extra-site': {
    name: 'Ekstra Site',
    description: 'Hesabınıza site başına ücretle daha fazla site ekleyin.',
  },
  'white-label': {
    name: 'White Label',
    description: 'Tüm sitelerinizde "Powered by" alt bilgisini kaldırın.',
  },
  'custom-amp-domain': {
    name: 'Özel AMP Domain',
    description: 'AMP sayfalarını kendi domaininizden (örn. amp.siteniz.com) tüm sitelerinizde sunun.',
  },
};

export function addonName(key: string | undefined, fallback: string, tr: boolean): string {
  if (tr && key && ADDON_TR[key]) return ADDON_TR[key].name;
  return fallback;
}

export function addonDescription(
  key: string | undefined,
  fallback: string | null | undefined,
  tr: boolean
): string {
  if (tr && key && ADDON_TR[key]) return ADDON_TR[key].description;
  return fallback || '';
}
