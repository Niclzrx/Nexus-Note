"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@nexus/design-system";
import { Check, X } from "lucide-react";
import { validatePassword, validateUsername } from "../../lib/auth/validation";
import { PasswordInput } from "./PasswordInput";

export function SignupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameFormatError = username ? validateUsername(username) : null;
  const passwordRules = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password ? "As senhas não coincidem." : null;

  // Debounced live availability check, only once the format itself is valid.
  useEffect(() => {
    if (usernameFormatError || !username) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const timeoutId = setTimeout(() => {
      fetch("/api/auth/resolve-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
        .then((r) => r.json())
        .then((data) => setUsernameAvailable(Boolean(data.available)))
        .catch(() => setUsernameAvailable(null))
        .finally(() => setCheckingUsername(false));
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [username, usernameFormatError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    if (usernameError) return setFormError(usernameError);
    if (passwordError) return setFormError(passwordError);
    if (confirmError) return setFormError(confirmError);
    if (usernameAvailable === false) return setFormError("Este nome de usuário já está em uso.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Não foi possível criar a conta.");
        setLoading(false);
        return;
      }
      router.push(data.requiresLogin ? "/login" : "/dashboard");
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
        />
        <div className="mt-1 min-h-[1rem] text-xs">
          {usernameFormatError ? (
            <span className="text-error">{usernameFormatError}</span>
          ) : checkingUsername ? (
            <span className="text-text-faint">Verificando…</span>
          ) : usernameAvailable === true ? (
            <span className="flex items-center gap-1 text-success">
              <Check className="h-3 w-3" /> Disponível
            </span>
          ) : usernameAvailable === false ? (
            <span className="flex items-center gap-1 text-error">
              <X className="h-3 w-3" /> Já em uso
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-text-muted">
          Senha
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {password.length > 0 ? (
          <ul className="mt-1.5 space-y-0.5 text-xs">
            <PasswordRule ok={passwordRules.length} label="Pelo menos 6 caracteres" />
            <PasswordRule ok={passwordRules.uppercase} label="Uma letra maiúscula" />
            <PasswordRule ok={passwordRules.number} label="Um número" />
          </ul>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-text-muted">
          Confirmar senha
        </label>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          invalid={Boolean(confirmError)}
        />
        {confirmError ? <p className="mt-1 text-xs text-error">{confirmError}</p> : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={loading}
        disabled={loading || !passwordValid || usernameAvailable === false}
      >
        Criar conta
      </Button>
    </form>
  );
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-success" : "text-text-faint"}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </li>
  );
}
