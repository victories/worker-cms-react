import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  type: string;
  required?: boolean;
  default_value?: string;
  placeholder?: string;
  description?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  position?: number;
  width?: 'full' | 'half';
  relation_type?: string;
}

interface DynamicFieldProps {
  field: ContentTypeField;
  value: any;
  onChange: (key: string, value: any) => void;
  error?: string;
}

export function DynamicField({ field, value, onChange, error }: DynamicFieldProps) {
  const val = value ?? field.default_value ?? '';

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'email':
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'richtext':
        return (
          <Textarea
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={8}
            className="font-mono text-sm"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={val === 'true' || val === true}
              onCheckedChange={(checked) => onChange(field.key, String(checked))}
            />
            {field.description && (
              <span className="text-sm text-muted-foreground">{field.description}</span>
            )}
          </div>
        );

      case 'select':
        return (
          <Select value={val} onValueChange={(v) => onChange(field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Seçiniz...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect': {
        const selected: string[] = val ? (typeof val === 'string' ? val.split(',').filter(Boolean) : val) : [];
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = isSelected
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    onChange(field.key, next.join(','));
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      case 'radio':
        return (
          <div className="flex flex-col gap-2">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={val === opt.value}
                  onChange={() => onChange(field.key, opt.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={val || '#000000'}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <Input
              value={val || '#000000'}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-32 font-mono"
              maxLength={9}
            />
          </div>
        );

      case 'image':
      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="text"
              value={val}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.type === 'image' ? 'Görsel URL veya R2 key...' : 'Dosya URL veya R2 key...'}
            />
            {field.type === 'image' && val && (
              <img src={val.startsWith('http') ? val : `/uploads/${val}`} alt="" className="max-h-32 rounded border" />
            )}
          </div>
        );

      case 'gallery':
        return (
          <Textarea
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder="Virgülle ayrılmış URL'ler..."
            rows={3}
          />
        );

      case 'relation':
        return (
          <Input
            type="number"
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={`${field.relation_type || 'post'} ID...`}
          />
        );

      default:
        return (
          <Input
            value={val}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className={`space-y-1.5 ${field.width === 'half' ? 'w-1/2' : 'w-full'}`}>
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {field.description && field.type !== 'checkbox' && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
