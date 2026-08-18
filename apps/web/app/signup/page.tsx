import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Panel } from "@nexus/design-system";
import { SignupForm } from "../../features/auth/SignupForm";

export const metadata = { title: "Criar conta — Nexus Note" };

export default function SignupPage() {
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
          <h1 className="mb-1 font-display text-lg font-semibold text-text">Criar conta</h1>
          <p className="mb-5 text-sm text-text-muted">Seus boards continuam 100% locais — a conta existe para compartilhamento.</p>
          <SignupForm />
        </Panel>

        <p className="mt-4 text-center text-xs text-text-faint">
          Já tem conta?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
