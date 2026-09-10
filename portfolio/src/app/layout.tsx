import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: {
    default: "Devfolio — Developer Portfolio Builder",
    template: "%s · Devfolio",
  },
  description:
    "Create a beautiful developer portfolio, import your GitHub projects, customize your design, and export your site without coding.",
  metadataBase: new URL("https://devfolio-builder.local"),
  openGraph: {
    title: "Developer Portfolio Builder — Build Your Portfolio in Minutes",
    description:
      "Create a professional developer portfolio in minutes. Import your GitHub, customize your design, and export your site — no coding required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Portfolio Builder — Build Your Portfolio in Minutes",
    description:
      "Import your GitHub, customize your design, and export your site — no coding required.",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('devfolio.theme');var d=m==='dark'||(m!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
