"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

const Ctx = createContext<{ mode: Mode; resolved: "light" | "dark"; setMode: (m: Mode) => void }>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
});

export const useTheme = () => useContext(Ctx);

function resolve(mode: Mode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("devfolio.theme") as Mode | null;
    const initial = stored === "light" || stored === "dark" ? stored : "system";
    setModeState(initial);
    setResolved(resolve(initial));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const m = (localStorage.getItem("devfolio.theme") as Mode | null) ?? "system";
      if (m === "system") setResolved(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setMode = useCallback((m: Mode) => {
    localStorage.setItem("devfolio.theme", m);
    setModeState(m);
    setResolved(resolve(m));
  }, []);

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}
