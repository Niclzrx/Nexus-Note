# Nexus Note

> Organize ideias. Conecte conhecimento.

Um espaço visual de conhecimento baseado em canvas infinito — 100% web, 100% local.
Sem contas, sem servidor, sem sincronização. Seus dados vivem no IndexedDB do seu navegador.

## Status deste projeto

Isto é a **Fase 1 (Foundation) + um recorte vertical real da Fase 2 (Core Canvas)** do
roadmap em `docs/roadmap.md`. Não é uma maquete: tudo que existe aqui compila, roda e
persiste dados de verdade. O que ainda não existe está listado explicitamente no roadmap,
sem código morto ou placeholders escondidos.

Já funciona hoje:

- Canvas infinito com pan, zoom (scroll / Ctrl+scroll / pinch), grid de pontos.
- **8 tipos de elemento** ponta a ponta: nota, texto, tarefa, checklist, lista, link,
  bookmark e código — cada um com edição inline própria, persistidos de verdade.
- Criação, seleção (clique, shift+clique, seleção por área), arraste,
  redimensionamento e exclusão (com soft-delete para a lixeira) de qualquer elemento.
- Conexões entre elementos (arraste do ícone de link de um card até outro).
- **Agrupar / desagrupar** (Ctrl+G / Ctrl+Shift+G) — mover um membro do grupo move o grupo inteiro.
- Undo/redo real via command stack (Ctrl+Z / Ctrl+Shift+Z).
- Persistência local em IndexedDB, com autosave do viewport e status "Salvando.../Salvo".
- Sidebar com boards, favoritos e busca; Dashboard; Command Palette (Ctrl/Cmd+K).
- Dark/Light mode; onboarding de primeiro acesso; landing page.
- **Busca global** (Ctrl/Cmd+K): digite para buscar entre ações e entre elementos
  de todos os boards ao mesmo tempo — selecionar um resultado navega até o board e
  centraliza o elemento no canvas.
- **Tags**: cada elemento pode ter tags (chips no property panel), e a busca já
  considera tags além de título/conteúdo.
- **Mídia**: arraste arquivos direto pro canvas (ou use o botão de upload) para criar
  imagens (preview real), vídeos e áudios (players nativos), PDFs e arquivos
  genéricos (card com nome/tamanho/abrir), e elementos de localização (endereço +
  coordenadas). Tudo fica salvo como blob no IndexedDB — nada sai do navegador.
- **Conta e compartilhamento** (Supabase + Postgres + RLS real): login/cadastro por
  usuário, sessão persistente, `/account`, e compartilhar um board com outro usuário
  como editor ou viewer. O *conteúdo* dos boards continua 100% local — só a
  autenticação e o registro de quem tem acesso a quê vivem no Supabase. Precisa de
  configuração própria, veja "Configurando autenticação" abaixo.

Ainda não implementado (próximas fases — ver `docs/roadmap.md`):

- Virtualização de renderização para 100k+ elementos (o índice espacial já existe em
  `packages/canvas`, mas o `Canvas.tsx` ainda renderiza todos os nós no DOM).
- Importação/exportação, lixeira com UI própria, testes automatizados.
- Mapa visual para o tipo Localização (hoje é só endereço + lat/lng em texto).
- Links de compartilhamento (`/share/<token>`) — schema já existe, falta a UI.
- Sincronização em tempo real do conteúdo entre usuários compartilhados (ver
  docs/roadmap.md, seção Fase 4.5, "Decisão de escopo").

## Rodando localmente

Pré-requisitos: Node.js ≥ 18.18 e [pnpm](https://pnpm.io) ≥ 9.

```bash
pnpm install
pnpm dev
```

Abra http://localhost:3000.

```bash
pnpm build   # build de produção de todos os pacotes
pnpm type-check
```

### Configurando autenticação (Fase 4.5)

O conteúdo dos boards continua 100% local — mas login, cadastro e
compartilhamento agora dependem de um projeto Supabase real. Sem isso, o
app builda normalmente mas `/login` e `/signup` não vão funcionar.

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No SQL Editor do projeto, rode o conteúdo de
   `supabase/migrations/0001_auth_and_sharing.sql`.
3. Em *Project Settings → API*, copie a **Project URL**, a **anon/public
   key** e a **service_role key**.
4. Crie `apps/web/.env.local` a partir de `apps/web/.env.example` e cole os
   três valores. **A service_role key nunca deve ter o prefixo
   `NEXT_PUBLIC_` nem ser commitada.**
5. (Opcional) Crie a conta de teste `admin`/`123456`:
   ```bash
   cd apps/web
   pnpm seed:admin
   ```
   Esse script se recusa a rodar se `NODE_ENV=production`.
6. `pnpm dev` na raiz e acesse `/signup` para criar sua conta, ou `/login`
   com a conta de teste acima.

## Estrutura

```text
nexus-note/
├── apps/web/            # Next.js 14 (App Router) — a aplicação
├── packages/
│   ├── types/            # Modelo de dados compartilhado
│   ├── storage/          # Camada de persistência (IndexedDB)
│   ├── canvas/            # Motor de coordenadas + índice espacial
│   └── design-system/    # Tokens, Tailwind preset, componentes base
└── docs/                 # Documentação de arquitetura
```

Veja `docs/architecture.md` para o raciocínio por trás de cada decisão.

---

## Reativar compartilhamento e sync

O compartilhamento está **desativado** mas o código completo permanece no
codebase (comentado). Para reativar:

### 1. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, rode o conteúdo de:
   - `supabase/migrations/0001_auth_and_sharing.sql`
   - `supabase/migrations/0002_board_content_and_realtime.sql`
3. Crie o bucket `board-assets` no Storage:
   - Nome: `board-assets`
   - Public: **true**
   - File size limit: `52428800` (50 MB)
4. Rode `supabase/migrations/0003_storage_policies.sql`
5. Copie Project URL, anon key e service role key em *Project Settings → API*
6. Crie `apps/web/.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`

### 2. Descomentar código nos arquivos

| Arquivo | O que descomentar |
|---------|-------------------|
| `apps/web/features/canvas/Canvas.tsx` | Imports de `useRealtime`, `usePresence`, `RemoteCursors`; chamadas dos hooks; `broadcastCursor` no `onPointerMove`; componente `<RemoteCursors>` |
| `apps/web/features/shell/BoardNavbar.tsx` | Restaurar versão anterior — botão Compartilhar, `registerDocumentOwnership`, `renameDocument`, `deleteDocumentOwnership`, indicador de sync |
| `apps/web/app/(app)/board/[boardId]/page.tsx` | Restaurar lógica de `getSharedBoardMeta` e `useSyncStore.setState({ isShared: true, role })` |
| `apps/web/app/(app)/dashboard/page.tsx` | Restaurar `syncBoardsFromSupabase`, `listSharedBoards` e seção "Compartilhados comigo" |

### 3. Verificar

```bash
pnpm build
```

O app deve compilar sem erros e o botão "Compartilhar" deve aparecer no
BoardNavbar ao abrir um board.
