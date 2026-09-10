export const ACCENTS: { id: string; label: string; hex: string; hexDark: string }[] = [
  { id: "indigo", label: "Indigo", hex: "#4f46e5", hexDark: "#818cf8" },
  { id: "blue", label: "Blue", hex: "#2563eb", hexDark: "#60a5fa" },
  { id: "emerald", label: "Emerald", hex: "#059669", hexDark: "#34d399" },
  { id: "amber", label: "Amber", hex: "#d97706", hexDark: "#fbbf24" },
  { id: "rose", label: "Rose", hex: "#e11d48", hexDark: "#fb7185" },
  { id: "violet", label: "Violet", hex: "#7c3aed", hexDark: "#a78bfa" },
  { id: "cyan", label: "Cyan", hex: "#0891b2", hexDark: "#22d3ee" },
  { id: "slate", label: "Slate", hex: "#475569", hexDark: "#94a3b8" },
];

export const FONTS: { id: string; label: string; body: string; display: string; mono: string; google: string | null }[] = [
  {
    id: "inter", label: "Inter",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    display: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    google: "Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500",
  },
  {
    id: "geist", label: "Geist",
    body: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
    display: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
    google: "Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500",
  },
  {
    id: "serif", label: "Editorial",
    body: "'Source Serif 4', Georgia, serif",
    display: "'Source Serif 4', Georgia, serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    google: "Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600",
  },
  {
    id: "mono", label: "Mono",
    body: "'JetBrains Mono', ui-monospace, monospace",
    display: "'JetBrains Mono', ui-monospace, monospace",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    google: "JetBrains+Mono:wght@400;500;600;700",
  },
  {
    id: "space", label: "Space",
    body: "'Space Grotesk', 'Inter', ui-sans-serif, sans-serif",
    display: "'Space Grotesk', 'Inter', ui-sans-serif, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    google: "Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500",
  },
  {
    id: "system", label: "System",
    body: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    display: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    mono: "ui-monospace, SFMono-Regular, monospace",
    google: null,
  },
];

export const accentHex = (id: string, dark: boolean) => {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  return dark ? a.hexDark : a.hex;
};

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];
