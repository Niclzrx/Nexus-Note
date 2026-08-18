import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Note — Organize ideias. Conecte conhecimento.",
  description:
    "Nexus Note é um espaço visual de conhecimento baseado em canvas infinito: notas, mídias, tarefas e links, todos conectáveis entre si. 100% local, sem contas.",
  openGraph: {
    title: "Nexus Note",
    description: "Organize ideias. Conecte conhecimento.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Note",
    description: "Organize ideias. Conecte conhecimento.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0D10",
  width: "device-width",
  initialScale: 1,
};

/**
 * Runs before paint to set `data-theme` from the last-known preference,
 * avoiding a flash of the wrong theme while the real value loads from
 * IndexedDB (async). This is the one legitimate use of localStorage here:
 * a synchronous cache mirror of the IndexedDB source of truth.
 */
const themeInitScript = `
(function () {
  try {
    var cached = window.localStorage.getItem("nexus-theme-cache");
    var theme = cached === "light" || cached === "dark" ? cached : null;
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
