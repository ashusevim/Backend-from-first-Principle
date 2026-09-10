"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { samplePortfolio } from "@/data/sample";
import { loadPortfolio, savePortfolio } from "@/lib/storage";
import { emptyPortfolio, type Portfolio } from "@/types/portfolio";

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(emptyPortfolio);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { portfolio: stored } = loadPortfolio();
    setPortfolio(stored);
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (prev: Portfolio) => Portfolio) => {
    setPortfolio((prev) => {
      const next = fn(prev);
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const ok = savePortfolio(next);
        setSaveState(ok ? "saved" : "error");
      }, 400);
      return next;
    });
  }, []);

  const replace = useCallback((next: Portfolio) => {
    setPortfolio(next);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState(savePortfolio(next) ? "saved" : "error");
    }, 200);
  }, []);

  const loadSample = useCallback(() => replace(samplePortfolio()), [replace]);
  const reset = useCallback(() => replace(emptyPortfolio()), [replace]);

  return { portfolio, update, replace, reset, loadSample, hydrated, saveState };
}

export type PortfolioUpdate = (fn: (prev: Portfolio) => Portfolio) => void;
