// Clinical helpers for the patient odontogram and phased treatment plans.

export type Notation = "fdi" | "universal";

/** FDI (11–48) → Universal (1–32) for permanent teeth. */
export function fdiToUniversal(fdi: number): number | null {
  const q = Math.floor(fdi / 10);
  const p = fdi % 10;
  if (p < 1 || p > 8) return null;
  if (q === 1) return 9 - p; // 18→1 … 11→8
  if (q === 2) return 8 + p; // 21→9 … 28→16
  if (q === 3) return 25 - p; // 38→17 … 31→24
  if (q === 4) return 24 + p; // 41→25 … 48→32
  return null;
}

export function toothLabel(fdi: number, notation: Notation): string {
  return notation === "fdi" ? String(fdi) : String(fdiToUniversal(fdi) ?? fdi);
}

export const PHASES = [
  { id: 1, title: "Phase 1 · Urgent / Pain relief" },
  { id: 2, title: "Phase 2 · Disease control & hygiene" },
  { id: 3, title: "Phase 3 · Rehabilitation & prosthodontics" },
  { id: 4, title: "Phase 4 · Maintenance & recall" },
] as const;

export type PhaseId = 1 | 2 | 3 | 4;

const RULES: [PhaseId, RegExp][] = [
  [1, /extract|pulpot|pulpect|abscess|incision|drainage|emergency|pain|root canal|rct|endodont/],
  [3, /crown|bridge|implant|denture|veneer|inlay|onlay|post|prosth|aligner|ortho/],
  [4, /recall|review|check-?up|maintenance|prophy|polish|fluoride|sealant|exam/],
  [2, /scal|root planing|perio|filling|restor|composite|amalgam|gic|desensit|bonding|repair/],
];

/** Classifies a procedure description into a clinical treatment phase. */
export function procedurePhase(description: string): PhaseId {
  const d = (description || "").toLowerCase();
  for (const [phase, re] of RULES) if (re.test(d)) return phase;
  return 2;
}
