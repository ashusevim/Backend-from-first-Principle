import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";

export const metadata: Metadata = {
  title: "Builder",
  description: "Build your developer portfolio with live preview. No account required.",
};

export default function BuilderPage() {
  return <BuilderShell />;
}
