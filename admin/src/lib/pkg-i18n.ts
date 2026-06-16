// Pick a package's name/description for the current UI language. The
// name/description columns are the default (Turkish); name_en/description_en
// are shown in English when set, otherwise we fall back to the default.
type PkgLike = {
  name: string;
  name_en?: string | null;
  description?: string | null;
  description_en?: string | null;
};

export function pkgName(p: PkgLike, tr: boolean): string {
  return !tr && p.name_en ? p.name_en : p.name;
}

export function pkgDescription(p: PkgLike, tr: boolean): string {
  return (!tr && p.description_en ? p.description_en : p.description) || '';
}
