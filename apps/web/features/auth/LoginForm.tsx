"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nexus/design-system";
import { validatePassword, validateUsername } from "../../lib/auth/validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const usernameError = validateUsername(username) ?? undefined;
    const passwordError = validatePassword(password) ?? undefined;
    setFieldErrors({ username: usernameError, password: passwordError });
    if (usernameError || passwordError) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Não foi possível entrar. Tente novamente.");
        setLoading(false);
        return;
      }
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setFormError("Falha de conexão. Verifique sua internet e tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-text-muted">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-colors focus:border-signal"
          aria-invalid={Boolean(fieldErrors.username)}
        />
        {fieldErrors.username ? <p className="mt-1 text-xs text-error">{fieldErrors.username}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-text-muted">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-colors focus:border-signal"
          aria-invalid={Boolean(fieldErrors.password)}
        />
        {fieldErrors.password ? <p className="mt-1 text-xs text-error">{fieldErrors.password}</p> : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={loading}>
        Entrar
      </Button>
    </form>
  );
}
