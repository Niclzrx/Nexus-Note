import Link from "next/link";
import { Sparkles, Network, Layers, Search, PenLine, Link2, Compass } from "lucide-react";
import { Button } from "@nexus/design-system";
import { LandingHeader } from "../features/landing/LandingHeader";

export const metadata = {
  title: "Nexus Note — Organize ideias. Conecte conhecimento.",
  description:
    "Um espaço visual de conhecimento baseado em canvas infinito: notas, mídias, tarefas e links, todos conectáveis entre si. 100% local, sem contas.",
};

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <LandingHeader />

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-12 pt-16 text-center">
        <div className="mb-10 w-full max-w-md">
          <CanvasIllustration />
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
          Organize ideias.
          <br />
          <span className="text-signal">Conecte conhecimento.</span>
        </h1>
        <p className="mt-4 max-w-lg text-base text-text-muted">
          Um canvas infinito onde notas, mídias, tarefas e links ganham vida.
          Tudo conectável entre si, 100% local, sem necessidade de contas.
        </p>
        <div className="mt-8 flex gap-3">
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
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="mb-10 text-center font-display text-lg font-semibold text-text">
          Como funciona
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <Step number={1} icon={<PenLine className="h-5 w-5" />} title="Crie" description="Adicione notas, imagens, tarefas e links ao canvas." />
          <Step number={2} icon={<Link2 className="h-5 w-5" />} title="Conecte" description="Ligue elementos para mapear relacionamentos." />
          <Step number={3} icon={<Compass className="h-5 w-5" />} title="Navegue" description="Busque, agrupe e navegue pelo seu conhecimento." />
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-6 px-6 pb-24 sm:grid-cols-3">
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
            <Link href="/login" className="hover:text-text transition-colors">Entrar</Link>
            <Link href="/signup" className="hover:text-text transition-colors">Criar conta</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function CanvasIllustration() {
  return (
    <svg viewBox="0 0 400 200" className="w-full text-text-muted" aria-hidden="true">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nx-node { animation: fadeUp 0.6s ease-out both; }
        .nx-node:nth-child(2) { animation-delay: 0.1s; }
        .nx-node:nth-child(3) { animation-delay: 0.2s; }
        .nx-node:nth-child(4) { animation-delay: 0.3s; }
        .nx-node:nth-child(5) { animation-delay: 0.4s; }
        .nx-line { stroke-dasharray: 4 6; animation: nx-pulse-thread 2s linear infinite; }
      `}</style>

      {/* Connection lines */}
      <line x1="80" y1="80" x2="200" y2="50" className="nx-line" stroke="rgb(var(--color-signal))" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="200" y1="50" x2="320" y2="90" className="nx-line" stroke="rgb(var(--color-signal))" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="200" y1="50" x2="160" y2="150" className="nx-line" stroke="rgb(var(--color-signal))" strokeOpacity="0.2" strokeWidth="1.5" />
      <line x1="320" y1="90" x2="300" y2="160" className="nx-line" stroke="rgb(var(--color-signal))" strokeOpacity="0.2" strokeWidth="1.5" />
      <line x1="80" y1="80" x2="160" y2="150" className="nx-line" stroke="rgb(var(--color-signal))" strokeOpacity="0.15" strokeWidth="1.5" />

      {/* Nodes */}
      <g className="nx-node">
        <rect x="50" y="62" width="60" height="36" rx="6" fill="rgb(var(--color-surface-elevated))" stroke="rgb(var(--color-border))" strokeWidth="1" />
        <text x="80" y="84" textAnchor="middle" fill="rgb(var(--color-text))" fontSize="10" fontFamily="var(--font-body)">Nota</text>
      </g>
      <g className="nx-node">
        <rect x="170" y="32" width="60" height="36" rx="6" fill="rgb(var(--color-signal))" fillOpacity="0.15" stroke="rgb(var(--color-signal))" strokeOpacity="0.4" strokeWidth="1" />
        <text x="200" y="54" textAnchor="middle" fill="rgb(var(--color-signal))" fontSize="10" fontFamily="var(--font-body)">Tarefa</text>
      </g>
      <g className="nx-node">
        <rect x="290" y="72" width="60" height="36" rx="6" fill="rgb(var(--color-surface-elevated))" stroke="rgb(var(--color-border))" strokeWidth="1" />
        <text x="320" y="94" textAnchor="middle" fill="rgb(var(--color-text))" fontSize="10" fontFamily="var(--font-body)">Link</text>
      </g>
      <g className="nx-node">
        <rect x="130" y="132" width="60" height="36" rx="6" fill="rgb(var(--color-surface-elevated))" stroke="rgb(var(--color-border))" strokeWidth="1" />
        <text x="160" y="154" textAnchor="middle" fill="rgb(var(--color-text))" fontSize="10" fontFamily="var(--font-body)">Imagem</text>
      </g>
      <g className="nx-node">
        <rect x="270" y="142" width="60" height="36" rx="6" fill="rgb(var(--color-surface-elevated))" stroke="rgb(var(--color-border))" strokeWidth="1" />
        <text x="300" y="164" textAnchor="middle" fill="rgb(var(--color-text))" fontSize="10" fontFamily="var(--font-body)">Código</text>
      </g>
    </svg>
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal/10 text-signal">
        {icon}
      </div>
      <h3 className="font-display text-sm font-semibold text-text">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}
