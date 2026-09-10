import { emptyPortfolio, parsePortfolio, type Portfolio } from "@/types/portfolio";

const KEY = "devfolio.portfolio.v1";

export function loadPortfolio(): { portfolio: Portfolio; repaired: boolean } {
  if (typeof window === "undefined") return { portfolio: emptyPortfolio(), repaired: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { portfolio: emptyPortfolio(), repaired: false };
    const parsed = JSON.parse(raw);
    return { portfolio: parsePortfolio(parsed), repaired: true };
  } catch {
    return { portfolio: emptyPortfolio(), repaired: false };
  }
}

export function savePortfolio(p: Portfolio): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    // quota exceeded (likely large images) — try without images
    try {
      const slim: Portfolio = {
        ...p,
        profile: { ...p.profile, photo: "" },
        projects: p.projects.map((pr) => ({ ...pr, image: "" })),
      };
      localStorage.setItem(KEY, JSON.stringify(slim));
      return false;
    } catch {
      return false;
    }
  }
}

export function clearPortfolio() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function hasStoredPortfolio(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
