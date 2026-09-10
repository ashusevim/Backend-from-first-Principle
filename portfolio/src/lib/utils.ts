export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function downloadFile(filename: string, content: Blob | string, mime = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDateRange(start: string, end: string, current: boolean): string {
  const fmt = (d: string) => {
    if (!d) return "";
    // accept YYYY-MM or YYYY or free text
    const m = /^(\d{4})-(\d{2})$/.exec(d);
    if (m) {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      return `${months[Number(m[2]) - 1]} ${m[1]}`;
    }
    return d;
  };
  const s = fmt(start);
  const e = current ? "Present" : fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** Downscale an image file to a data URL (max dimension, JPEG/PNG). */
export function fileToDataUrl(file: File, maxDim = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
