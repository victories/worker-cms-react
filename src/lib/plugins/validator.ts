const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /import\s*\(/,
  /require\s*\(/,
  /globalThis\b/,
  /process\b/,
  /Deno\b/,
];

const MAX_CODE_SIZE = 1024 * 1024; // 1MB

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePluginCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (code.length > MAX_CODE_SIZE) {
    errors.push(`Plugin kodu cok buyuk: ${(code.length / 1024).toFixed(0)}KB (max: 1024KB)`);
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`Yasakli kod deseni: ${pattern.source}`);
    }
  }

  if (!code.includes('export default')) {
    errors.push('Plugin "export default" ile bir fetch handler export etmelidir');
  }

  if (!code.includes('fetch')) {
    warnings.push('Plugin fetch handler icermiyor - hook\'lar calismayabilir');
  }

  return { valid: errors.length === 0, errors, warnings };
}
