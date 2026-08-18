# Arquitetura

## Visão geral

Nexus Note é um monorepo pnpm/Turborepo. `apps/web` é a única aplicação (Next.js 14,
App Router). Tudo que é reutilizável, testável isoladamente ou que representa uma
fronteira de domínio clara vive em `packages/*`:

- **`@nexus/types`** — o modelo de dados. Nenhum outro pacote define uma entidade de
  domínio; todos importam daqui. É a fonte da verdade sobre o que é um `Board`, um
  `NexusElement`, uma `Connection`.
- **`@nexus/storage`** — a única camada que fala com `indexedDB` diretamente
  (`db.ts`). Todo o resto do app (stores, componentes) fala com `StorageService`,
  nunca com IndexedDB. Isso é o que torna viável trocar o backend de persistência no
  futuro sem reescrever a UI — o objetivo explícito da seção 8 do briefing.
- **`@nexus/canvas`** — lógica pura (sem React) de coordenadas de mundo/tela e o
  índice espacial (`SpatialGrid`). Pura o suficiente para ser testada sem montar
  nenhum componente.
- **`@nexus/design-system`** — tokens de design como CSS custom properties + preset
  Tailwind + componentes primitivos (`Button`, `IconButton`, `Panel`). Nenhuma cor ou
  espaçamento "mágico" deveria existir fora daqui.

Dentro de `apps/web`, a organização é por responsabilidade, não por tipo de arquivo:

```text
app/            # Rotas (App Router) — o mínimo de lógica possível
features/       # Componentes de UI específicos de um domínio (canvas, shell)
stores/         # Estado global (Zustand), um arquivo por domínio
hooks/          # Hooks reutilizáveis entre features
lib/            # Utilidades puras sem dependência de React
```

## Fluxo de dados

```text
Interação do usuário
        ↓
Componente React (features/canvas/*)
        ↓
Store Zustand (stores/element-store.ts)
        ↓
StorageService (@nexus/storage)
        ↓
IndexedDB
```

A UI nunca importa `@nexus/storage`'s `db.ts` diretamente, e nunca faz `await
indexedDB...`. Ela chama uma action da store (ex: `createNote`), que atualiza o
estado em memória de forma síncrona (para a UI responder instantaneamente) e dispara
a persistência de forma assíncrona e "fire and forget" — a store não espera o
IndexedDB confirmar antes de deixar a interação parecer instantânea.

## Por que Zustand com stores separadas por domínio (§47)

Uma única store gigante com todo o estado do app cria dois problemas: qualquer
componente que lê qualquer fatia re-renderiza a cada mudança em qualquer outra fatia
(a menos que se use seletores em todo lugar, o que é fácil de esquecer), e o arquivo
vira ilegível. Dividir por domínio (`ui-store`, `workspace-store`, `canvas-store`,
`element-store`, `selection-store`, `history-store`) faz cada store ter uma única
responsabilidade e permite que componentes assinem exatamente a fatia que precisam
via seletor (`useElementStore((s) => s.elements)`).

## Por que DOM (não WebGL/Canvas2D puro) para os nós — por enquanto

A seção 4 do briefing pede que a escolha da tecnologia do canvas seja explicada.
Nós (Notes, e futuramente Tasks, Checklists etc.) precisam de conteúdo rico e
editável: `<textarea>`, inputs, syntax highlighting, players de vídeo. Reimplementar
isso em WebGL ou Canvas2D é um custo enorme para um ganho de performance que só
importa em escala muito grande. A decisão desta fase:

- Nós são `<div>`s absolutamente posicionados dentro de uma única camada com
  `transform: translate(...) scale(zoom)` — pan e zoom são operações de GPU (uma
  única propriedade CSS), não um recálculo de posição por nó.
- Conexões são um único `<svg>` também dentro dessa camada transformada, usando
  coordenadas de mundo diretamente — o SVG "ganha" pan/zoom de graça pelo mesmo
  transform do pai.
- O índice espacial (`SpatialGrid`) já existe e é usado hoje para seleção por área
  (marquee) e para o cálculo do minimapa. **Ainda não é usado para limitar quais nós
  são montados no DOM** — isso é o próximo passo antes de perseguir a meta de 100k+
  elementos (ver `docs/performance.md` e `docs/roadmap.md`, Fase 5). A escolha de
  arquitetura já deixa esse caminho pronto: trocar `elementList.map(...)` por
  `grid.query(viewportWorldBounds).map(...)` não exige mudar nenhuma store.

Se, mais adiante, o perfil de uso mostrar que DOM não aguenta a meta de escala mesmo
com virtualização, a camada de renderização pode ser trocada por Canvas2D/WebGL sem
tocar em `@nexus/types`, `@nexus/storage` ou nas stores — elas não sabem como os nós
são desenhados.

## Sistema de coordenadas (§50)

Ver `packages/canvas/src/coordinates.ts`. Duas coordenadas: **tela** (pixels
relativos ao container do canvas) e **mundo** (o plano infinito onde os elementos
vivem). `CanvasViewport { x, y, zoom }` guarda o ponto do mundo que está sob o
canto superior esquerdo da tela, e o zoom atual. Toda conversão passa por
`screenToWorld`/`worldToScreen`; nenhum componente calcula essa matemática
manualmente, para evitar bugs de escala (o problema que a seção 50 do briefing pede
para evitar explicitamente).

## Histórico / Undo-Redo (§15, §51)

`stores/history-store.ts` implementa um command stack simples: cada operação
reversível (criar, mover, redimensionar, excluir, conectar) empurra um `Command {
undo, redo }` depois de já ter sido aplicada. Drags contínuos (mover, redimensionar)
usam um padrão `begin*` / aplicação ao vivo sem histórico / `commit*` — isso evita
que cada pixel de movimento vire uma entrada de undo separada (o anti-padrão que a
seção 15 do briefing pede para evitar).
