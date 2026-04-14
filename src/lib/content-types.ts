/**
 * Content Types library - Visual Schema Builder
 * Defines custom content types with configurable fields
 */

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'date' | 'datetime'
  | 'select' | 'multiselect' | 'checkbox' | 'radio'
  | 'image' | 'file' | 'gallery'
  | 'color' | 'url' | 'email' | 'relation';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface ContentTypeField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default_value?: string;
  placeholder?: string;
  description?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  position?: number;
  width?: 'full' | 'half';
  relation_type?: string; // post_type slug for relation fields
}

export interface ContentType {
  id: number;
  site_id: number;
  slug: string;
  name: string;
  name_singular?: string;
  name_plural?: string;
  description?: string;
  icon: string;
  fields: ContentTypeField[];
  supports: string[];
  taxonomies: string[];
  has_archive: number;
  is_hierarchical: number;
  menu_position: number;
  status: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'richtext', 'number', 'date', 'datetime',
  'select', 'multiselect', 'checkbox', 'radio',
  'image', 'file', 'gallery',
  'color', 'url', 'email', 'relation',
];

const RESERVED_SLUGS = ['post', 'page', 'attachment', 'revision', 'nav_menu_item'];

/** Validate field definitions array */
export function validateFieldDefinitions(fields: ContentTypeField[]): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (!f.key || !f.key.trim()) {
      errors.push(`Alan ${i + 1}: key gerekli`);
    } else if (!/^[a-z][a-z0-9_]*$/.test(f.key)) {
      errors.push(`Alan "${f.key}": key sadece küçük harf, rakam ve alt çizgi içerebilir`);
    } else if (keys.has(f.key)) {
      errors.push(`Alan "${f.key}": key tekrar ediyor`);
    } else {
      keys.add(f.key);
    }

    if (!f.label || !f.label.trim()) {
      errors.push(`Alan ${i + 1}: label gerekli`);
    }

    if (!f.type || !VALID_FIELD_TYPES.includes(f.type)) {
      errors.push(`Alan "${f.key || i + 1}": geçersiz tip "${f.type}"`);
    }

    if ((f.type === 'select' || f.type === 'multiselect' || f.type === 'radio') && (!f.options || f.options.length === 0)) {
      errors.push(`Alan "${f.key}": ${f.type} tipi için options gerekli`);
    }

    if (f.type === 'relation' && !f.relation_type) {
      errors.push(`Alan "${f.key}": relation tipi için relation_type gerekli`);
    }
  }

  return errors;
}

/** Validate content type slug */
export function validateSlug(slug: string): string | null {
  if (!slug || !slug.trim()) return 'Slug gerekli';
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return 'Slug sadece küçük harf, rakam ve tire içerebilir';
  if (slug.length > 40) return 'Slug en fazla 40 karakter olabilir';
  if (RESERVED_SLUGS.includes(slug)) return `"${slug}" ayrılmış bir slug, başka bir isim seçin`;
  return null;
}

/** Validate post meta values against content type field definitions */
export function validatePostMeta(
  meta: Record<string, any>,
  fields: ContentTypeField[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = meta[field.key];

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.key] = `${field.label} gerekli`;
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    // Validation rules
    if (field.validation) {
      const v = field.validation;

      if (field.type === 'number' && typeof Number(value) === 'number') {
        if (v.min !== undefined && Number(value) < v.min) {
          errors[field.key] = v.message || `${field.label} en az ${v.min} olmalı`;
        }
        if (v.max !== undefined && Number(value) > v.max) {
          errors[field.key] = v.message || `${field.label} en fazla ${v.max} olmalı`;
        }
      }

      if (typeof value === 'string') {
        if (v.min !== undefined && value.length < v.min) {
          errors[field.key] = v.message || `${field.label} en az ${v.min} karakter olmalı`;
        }
        if (v.max !== undefined && value.length > v.max) {
          errors[field.key] = v.message || `${field.label} en fazla ${v.max} karakter olmalı`;
        }
        if (v.pattern) {
          try {
            if (!new RegExp(v.pattern).test(value)) {
              errors[field.key] = v.message || `${field.label} geçersiz format`;
            }
          } catch { /* invalid regex, skip */ }
        }
      }
    }

    // Type-specific validation
    if (field.type === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.key] = `${field.label} geçerli bir email olmalı`;
    }

    if (field.type === 'url' && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
      errors[field.key] = `${field.label} geçerli bir URL olmalı`;
    }

    if (field.type === 'color' && typeof value === 'string' && !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      errors[field.key] = `${field.label} geçerli bir renk kodu olmalı (#hex)`;
    }
  }

  return errors;
}

/** Get default field configuration for a given type */
export function getFieldDefaults(type: FieldType): Partial<ContentTypeField> {
  const base: Partial<ContentTypeField> = { type, required: false, width: 'full' };

  switch (type) {
    case 'text': return { ...base, placeholder: 'Metin girin...' };
    case 'textarea': return { ...base, placeholder: 'Detaylı metin...' };
    case 'richtext': return { ...base };
    case 'number': return { ...base, default_value: '0' };
    case 'date': return { ...base };
    case 'datetime': return { ...base };
    case 'select': return { ...base, options: [{ label: 'Seçenek 1', value: 'option1' }] };
    case 'multiselect': return { ...base, options: [{ label: 'Seçenek 1', value: 'option1' }] };
    case 'checkbox': return { ...base, default_value: 'false' };
    case 'radio': return { ...base, options: [{ label: 'Seçenek 1', value: 'option1' }] };
    case 'image': return { ...base };
    case 'file': return { ...base };
    case 'gallery': return { ...base };
    case 'color': return { ...base, default_value: '#000000' };
    case 'url': return { ...base, placeholder: 'https://...' };
    case 'email': return { ...base, placeholder: 'email@example.com' };
    case 'relation': return { ...base, relation_type: 'post' };
    default: return base;
  }
}
