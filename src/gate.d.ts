// Type declaration for the hand-written gate.js middleware.
// Keeps gate.js byte-identical (per GATE_ENTEGRASYON.md) while giving
// index.ts a typed import.
export function runGate(request: Request, env: any): Promise<Response | null>;
