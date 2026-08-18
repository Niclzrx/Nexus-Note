import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Link2,
  Zap,
  StickyNote,
  CheckSquare,
  Code2,
  Image as ImageIcon,
  MapPin,
  Sparkles,
} from "lucide-react";

const elementTypes = [
  { icon: StickyNote, label: "Notas" },
  { icon: CheckSquare, label: "Tarefas" },
  { icon: Link2, label: "Links" },
  { icon: Code2, label: "Código" },
  { icon: ImageIcon, label: "Imagens" },
  { icon: MapPin, label: "Locais" },
];

// Node positions AND the connecting lines below share this single 0-100
// percentage coordinate space, so they can never drift apart the way fixed
// pixel path coordinates did against percentage-positioned cards.
const DEMO_NODES: { title: string; x: number; y: number; accent: "signal" | "ember" | "success" }[] = [
  { title: "Pesquisa", x: 8, y: 18, accent: "signal" },
  { title: "Roadmap Q3", x: 38, y: 10, accent: "ember" },
  { title: "Referências", x: 62, y: 46, accent: "signal" },
  { title: "Tarefas", x: 16, y: 58, accent: "success" },
];

const DEMO_CONNECTIONS: [string, string][] = [
  ["Pesquisa", "Roadmap Q3"],
  ["Roadmap Q3", "Referências"],
  ["Tarefas", "Referências"],
];

/** Approximate visual center of a DemoNode card (which is w-28 / ~112px tall-ish), in the same percent space as its x/y. */
function demoNodeCenter(title: string) {
  const node = DEMO_NODES.find((n) => n.title === title);
  if (!node) return { x: 0, y: 0 };
  return { x: node.x + 7, y: node.y + 6 };
}

const faqs = [
  {
    q: "Preciso criar uma conta?",
    a: "Só se quiser compartilhar boards com outras pessoas. O conteúdo em si — notas, canvas, conexões — sempre vive no seu navegador.",
  },
  {
    q: "Onde meus dados ficam salvos?",
    a: "O conteúdo dos boards fica no IndexedDB do seu navegador. A conta guarda só o essencial: quem é dono de cada board e com quem foi compartilhado.",
  },
  {
    q: "Funciona offline?",
    a: "Sim. Depois do primeiro carregamento, você pode criar, editar e conectar elementos sem internet — só compartilhar exige conexão.",
  },
  {
    q: "Quantos elementos o canvas aguenta?",
    a: "A arquitetura foi desenhada para suportar dezenas de milhares de elementos por board, com virtualização e indexação espacial.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-bg text-text" data-theme="dark">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal/15 text-signal">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight">Nexus Note</span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-signal px-3.5 text-sm font-medium text-white transition-colors hover:bg-signal/90"
        >
          Abrir o app <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Seus boards ficam no seu navegador
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Organize ideias.
          <br />
          <span className="text-signal">Conecte conhecimento.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-text-muted">
          Nexus Note é um espaço visual de conhecimento baseado em canvas infinito. Notas, tarefas,
          links, código e mais — tudo pode coexistir, e tudo pode se conectar.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-signal px-5 text-sm font-medium text-white transition-colors hover:bg-signal/90"
          >
            Começar agora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Canvas demo illustration */}
        <div className="relative mx-auto mt-16 aspect-[16/9] max-w-3xl overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_64px_-24px_rgb(var(--shadow-color)/0.6)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(var(--color-canvas-dot)/0.5)_1.5px,transparent_1.5px)] bg-[length:26px_26px]" />
          {DEMO_NODES.map((n) => (
            <DemoNode key={n.title} x={n.x} y={n.y} title={n.title} accent={n.accent} />
          ))}
          {/* viewBox 0 0 100 100 + preserveAspectRatio="none": path coordinates
              are expressed in the same 0-100 percentage space as the nodes'
              left/top styles below, so the lines track the cards at any
              container width instead of the two drifting apart on anything
              other than one specific pixel width. */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {DEMO_CONNECTIONS.map(([fromTitle, toTitle]) => {
              const a = demoNodeCenter(fromTitle);
              const b = demoNodeCenter(toTitle);
              const midX = (a.x + b.x) / 2;
              return (
                <path
                  key={`${fromTitle}-${toTitle}`}
                  d={`M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`}
                  stroke="rgb(var(--color-text-faint))"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  fill="none"
                />
              );
            })}
          </svg>
        </div>
      </section>

      {/* Concept */}
      <section className="border-y border-border bg-surface/50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-2xl font-semibold">Não é um app de notas.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
            É um espaço visual onde diferentes tipos de informação coexistem — e onde a conexão entre
            eles é a própria organização.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {elementTypes.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2 rounded-full border border-border bg-bg px-3.5 py-1.5 text-xs text-text-muted"
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          <Feature
            icon={Link2}
            title="Conexões"
            body="Qualquer elemento pode se conectar a qualquer outro, com direção, cor e legenda próprias."
          />
          <Feature
            icon={Layers}
            title="Canvas infinito"
            body="Zoom fluido, pan suave, grid inteligente e seleção por área — pensado para exploração livre."
          />
          <Feature
            icon={Zap}
            title="Performance"
            body="Indexação espacial e virtualização mantêm o canvas fluido mesmo com dezenas de milhares de elementos."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-center font-display text-2xl font-semibold">Perguntas frequentes</h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-lg border border-border bg-bg p-4">
                <p className="text-sm font-medium text-text">{f.q}</p>
                <p className="mt-1.5 text-sm text-text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-semibold">Suas ideias já estão conectadas.</h2>
        <p className="mt-2 text-sm text-text-muted">Falta só um espaço para você ver isso.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-signal px-5 text-sm font-medium text-white transition-colors hover:bg-signal/90"
        >
          Abrir o Nexus Note <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-text-faint">
        Nexus Note — conteúdo 100% local, conta só para compartilhar.
      </footer>
    </main>
  );
}

function DemoNode({
  x,
  y,
  title,
  accent,
}: {
  x: number;
  y: number;
  title: string;
  accent: "signal" | "ember" | "success";
}) {
  const accentClass = { signal: "border-l-signal", ember: "border-l-ember", success: "border-l-success" }[accent];
  return (
    <div
      className={`absolute w-28 rounded-md border border-border ${accentClass} border-l-2 bg-surface-elevated px-2.5 py-2 shadow-sm`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <p className="text-[11px] font-medium text-text">{title}</p>
      <div className="mt-1.5 h-1 w-3/4 rounded-full bg-border" />
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Link2; title: string; body: string }) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/15 text-signal">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-text-muted">{body}</p>
    </div>
  );
}
