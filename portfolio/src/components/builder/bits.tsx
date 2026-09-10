"use client";

import { useRef, useState } from "react";
import { ChevronDown, GripVertical, ImagePlus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/utils";

export function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-[260px] whitespace-pre-line text-[13px] text-muted-foreground">
        {body}
      </p>
      <div className="mt-4 flex justify-center">{action}</div>
    </div>
  );
}

export function ItemCard({
  title,
  subtitle,
  open,
  onToggle,
  onDelete,
  onMove,
  children,
  featured,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMove?: (dir: -1 | 1) => void;
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", featured && "border-primary/50")}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-accent"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title || <span className="text-muted-foreground">Untitled</span>}
            {subtitle && <span className="ml-2 truncate text-xs font-normal text-muted-foreground">{subtitle}</span>}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {onMove && (
          <span className="flex shrink-0">
            <button type="button" aria-label={`Move ${title} up`} onClick={() => onMove(-1)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={`Move ${title} down`} onClick={() => onMove(1)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && <div className="space-y-3 border-t border-border p-3">{children}</div>}
    </div>
  );
}

export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function TechInput({
  values,
  onChange,
  placeholder = "Add technology + Enter",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (v && !values.includes(v)) onChange([...values, v].slice(0, 12));
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={placeholder}
        className="mt-2"
      />
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="h-14 w-14 rounded-md border border-border object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
          <ImagePlus className="h-5 w-5" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={label}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await fileToDataUrl(f));
            } catch {
              /* ignore */
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? "Processing…" : value ? "Change" : "Upload"}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Stored locally, auto-resized.</p>
      </div>
    </div>
  );
}
