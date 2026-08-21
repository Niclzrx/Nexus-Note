"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@nexus/design-system";

export function LandingHeader() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nexus-theme-cache", next);
    setTheme(next);
  }

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-display text-base font-semibold tracking-tight text-text">
          Nexus Note
        </span>
      </Link>
      <nav className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Entrar
          </Button>
        </Link>
        <Link href="/signup">
          <Button variant="primary" size="sm">
            Criar conta
          </Button>
        </Link>
      </nav>
    </header>
  );
}
