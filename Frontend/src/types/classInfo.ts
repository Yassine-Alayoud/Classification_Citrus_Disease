export const CLASS_INFO: Record<string, { label: string }> = {
  black_spot: { label: "Tache noire" },
  canker: { label: "Chancre" },
  greening: { label: "Greening (HLB)" },
  healthy: { label: "Sain" },
  scab: { label: "Gale" },
  rot: { label: "Pourriture" },
};

export function labelFor(key: string) {
  return CLASS_INFO[key]?.label ?? key;
}
