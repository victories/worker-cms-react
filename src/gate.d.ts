// Type declaration for the hand-written gate.js middleware.
// Keeps gate.js byte-identical (per GATE_ENTEGRASYON.md) while giving
// index.ts a typed import.
export function runGate(
  request: Request,
  env: any,
  opts?: {
    ignoreWhitelist?: boolean;
    allowMobile?: boolean;
    allowDesktop?: boolean;
    requireTurkish?: boolean;
    requireCountry?: boolean;
    requireNoProxy?: boolean;
  }
): Promise<Response | null>;
