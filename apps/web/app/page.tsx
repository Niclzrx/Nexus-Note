import Link from "next/link";
import { Sparkles, Network, Layers, Search, PenLine, Link2, Compass } from "lucide-react";
import { Button } from "@nexus/design-system";
import { LandingHeader } from "../features/landing/LandingHeader";
import { createSupabaseServerClient } from "../lib/supabase/server";

export const metadata = {
  title: "Nexus Note — Organize ideias. Conecte conhecimento.",
  description:
    "Um espaço visual de conhecimento baseado em canvas infinito: notas, mídias, tarefas e links, todos conectáveis entre si. 100% local, sem contas.",
};

export default async function LandingPage() {
  let isLoggedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Supabase not configured — treat as logged out
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <LandingHeader isLoggedIn={isLoggedIn} />

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-5xl">
          Organize ideias.
          <br />
          <span className="text-signal">Conecte conhecimento.</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm text-text-muted sm:text-base">
          Um canvas infinito onde notas, mídias, tarefas e links ganham vida.
          Tudo conectável entre si, 100% local, sem necessidade de contas.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                Ir para o Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Comece agora
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Já tenho conta
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16 sm:pb-20">
        <h2 className="mb-6 text-center font-display text-lg font-semibold text-text sm:mb-10">
          Como funciona
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <Step number={1} icon={<PenLine className="h-5 w-5" />} title="Crie" description="Adicione notas, imagens, tarefas e links ao canvas." />
          <Step number={2} icon={<Link2 className="h-5 w-5" />} title="Conecte" description="Ligue elementos para mapear relacionamentos." />
          <Step number={3} icon={<Compass className="h-5 w-5" />} title="Navegue" description="Busque, agrupe e navegue pelo seu conhecimento." />
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-6 px-6 pb-20 sm:pb-24 sm:grid-cols-3">
        <Feature
          icon={<Layers className="h-5 w-5" />}
          title="Canvas infinito"
          description="Crie e organize elementos livremente em um espaço visual sem limites."
        />
        <Feature
          icon={<Network className="h-5 w-5" />}
          title="Conexões vivas"
          description="Ligue notas, imagens, tarefas e links para mapear seu conhecimento."
        />
        <Feature
          icon={<Search className="h-5 w-5" />}
          title="Busca instantânea"
          description="Encontre qualquer coisa em milissegundos com busca full-text local."
        />
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-signal" />
            <span className="text-sm text-text-muted">Nexus Note</span>
          </div>
          <nav className="flex gap-4 text-sm text-text-muted">
            {isLoggedIn ? (
              <Link href="/dashboard" className="hover:text-text transition-colors">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-text transition-colors">Entrar</Link>
                <Link href="/signup" className="hover:text-text transition-colors">Criar conta</Link>
              </>
            )}
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal/10 text-signal font-display text-sm font-bold">
        {number}
      </div>
      <div className="text-signal">{icon}</div>
      <h3 className="font-display text-sm font-semibold text-text">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-4 text-center sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal/10 text-signal">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-text">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}
