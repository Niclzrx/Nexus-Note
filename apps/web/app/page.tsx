import Link from "next/link";
import { Sparkles, Network, Layers, Search } from "lucide-react";
import { Button } from "@nexus/design-system";

export const metadata = {
  title: "Nexus Note — Organize ideias. Conecte conhecimento.",
  description:
    "Um espaço visual de conhecimento baseado em canvas infinito: notas, mídias, tarefas e links, todos conectáveis entre si. 100% local, sem contas.",
};

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg" data-theme="dark">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-text">
            Nexus Note
          </span>
        </div>
        <nav className="flex items-center gap-3">
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

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
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
    </main>
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
