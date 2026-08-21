import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { Panel } from "@nexus/design-system";
import { LoginForm } from "../features/auth/LoginForm";

export const metadata = { title: "Entrar — Nexus Note" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4" data-theme="dark">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-text">Nexus Note</span>
        </div>

        <Panel elevated className="p-6">
          <h1 className="mb-1 font-display text-lg font-semibold text-text">Entrar</h1>
          <p className="mb-5 text-sm text-text-muted">Acesse seus boards.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </Panel>

        <p className="mt-4 text-center text-xs text-text-faint">
          Não tem conta?{" "}
          <Link href="/signup" className="text-signal hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
