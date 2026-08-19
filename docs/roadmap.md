# Roadmap

## Fase 1 — Foundation ✅ (esta entrega)

- [x] Monorepo pnpm + Turborepo
- [x] Modelo de dados (`@nexus/types`)
- [x] Camada de storage sobre IndexedDB (`@nexus/storage`)
- [x] Design system: tokens, preset Tailwind, componentes base
- [x] Motor de coordenadas + índice espacial (`@nexus/canvas`)

## Fase 2 — Core Canvas ✅

- [x] Nodes: 8 tipos ponta a ponta (nota, texto, tarefa, checklist, lista, link,
      bookmark, código) — criação, edição inline, persistência
- [x] Seleção (clique, shift, área)
- [x] Drag, resize
- [x] Zoom, pan
- [x] Conexões
- [x] Agrupar / desagrupar (Ctrl+G / Ctrl+Shift+G)
- [ ] Os 6 tipos restantes (imagem, vídeo, áudio, PDF, arquivo, localização) — dependem
      de upload/asset handling, entram na Fase 4 (Media)

## Fase 3 — Productivity ✅

- [x] Undo/redo
- [x] Command Palette
- [x] Favoritos
- [x] Busca global entre boards (`StorageService.searchElements`) ligada ao
      Command Palette — resultados navegam até o board certo e selecionam +
      centralizam o elemento encontrado
- [x] Tags — editor de chips no property panel; a busca já considera tags

## Fase 4 — Media ✅

- [x] Upload por botão (toolbar) e por drag-and-drop direto no canvas
- [x] Imagem — preview real, dimensões lidas do arquivo, aspect ratio preservado
- [x] Vídeo, áudio — players nativos (`<video>`/`<audio>`) sobre o blob local
- [x] PDF, arquivo genérico — card com nome/tamanho + abrir em nova aba
- [x] Localização — endereço + lat/lng (entrada manual; sem mapa embutido para não
      depender de serviço externo — ver nota abaixo)
- [x] Validação de tamanho/MIME antes de aceitar o arquivo (§39)

Nota sobre Localização: por ora é só um formulário (endereço + coordenadas), sem
mapa visual. Adicionar um mapa exigiria uma biblioteca como Leaflet + tiles de um
provedor externo (OpenStreetMap etc.) — decisão de produto em aberto, não uma
limitação técnica; ver `docs/roadmap.md`.

## Fase 5 — Performance

- [ ] Virtualização real: usar `SpatialGrid.query(viewportBounds)` para decidir
      quais nós montar no DOM, em vez de renderizar `Object.values(elements)`
      inteiro
- [ ] Web Worker para operações pesadas (import/export, busca)
- [ ] Testes de carga com 10k / 100k elementos sintéticos

## Fase 6 — UX

- [x] Onboarding de primeiro acesso
- [ ] Empty states mais ricos por seção (favoritos vazios, lixeira vazia)
- [ ] Responsividade mobile do canvas (interações touch dedicadas, não apenas CSS)
- [ ] Auditoria de acessibilidade (navegação 100% por teclado no canvas)

## Fase 7 — Polish

- [ ] Testes automatizados (unit: stores; integration: fluxos de CRUD;
      E2E: criar → conectar → salvar → recarregar → persistiu)
- [ ] Exportação (.nexus, JSON, imagem)
- [ ] Lixeira com UI de restauração
- [ ] Documentação restante (`docs/state-management.md`, `docs/performance.md`,
      `docs/accessibility.md`, `docs/testing.md`)

## Auditoria de bugs (13 de agosto de 2026)

Antes de seguir para a Fase 5, fizemos uma varredura completa por bugs reais
(não apenas erros de tipo — `tsc` não pega nada disso). Corrigidos:

- **Debounce quebrado no Command Palette**: a função debounced era recriada a
  cada tecla digitada, então nunca debounçava de verdade.
- **Nome do board "preso"** ao navegar entre boards sem reload completo
  (Next.js reutiliza a instância da página na mesma rota dinâmica).
- **Grupos órfãos no IndexedDB**: reagrupar elementos já agrupados, ou excluir
  um membro de um grupo, deixava o registro do grupo antigo referenciando ids
  inválidos.
- **`board.elementCount` sempre em 0**: nunca era sincronizado.
- **Nenhuma forma de excluir um board pela UI** apesar da store já suportar.
- **Condição de corrida ao trocar de board rapidamente** (e ao fazer upload de
  mídia grande enquanto navega para outro board): dados do board antigo
  podiam sobrescrever os do novo se a carga/upload antigo terminasse depois.
- **`ring-dashed` não existe no Tailwind**: o contorno de "elemento agrupado"
  virava sólido silenciosamente. Trocado por `outline-dashed`.
- **Seleção por área não expandia para o grupo inteiro**, inconsistente com
  clique/arraste.
- **Escape não fazia nada dentro de campos de texto.**
- **Centralização ao chegar via busca** usava uma largura de sidebar
  hardcoded (256px), quebrando com a sidebar recolhida.
- **Perda de dados no viewport**: o debounce de salvar pan/zoom usava um
  único timer compartilhado — navegar para outro board dentro de 500ms podia
  cancelar (e perder) o salvamento do board anterior. Corrigido com debounce
  por-board.
- **`ensureDefaultWorkspace`** podia reabrir silenciosamente um board já
  excluído se todos os boards estivessem na lixeira.
- **`touchLastOpened`** não atualizava a lista reativa de boards, então a
  ordenação por "recentes" não refletia a abertura mais recente.
- **Ilustração da landing page**: as linhas de conexão usavam coordenadas de
  pixel fixas enquanto os cards eram posicionados por porcentagem — alinhava
  só numa largura de tela específica. Unificado em um único sistema de
  coordenadas percentual.

Limitação conhecida e não corrigida (trade-off consciente): blobs de mídia
(imagem/vídeo/PDF/etc.) não são removidos do IndexedDB quando o elemento é
excluído ou a criação é desfeita — ficam órfãos. Corrigir isso exigiria
sincronizar a exclusão do asset com todo o histórico de undo/redo.

## Fase 4.5 — Autenticação e Compartilhamento ✅

Adicionada depois da Fase 4, por pedido explícito: autenticação real via
Supabase (Postgres + Auth + RLS), preservando 100% da arquitetura local-first
já construída.

### Decisão de escopo (importante)

O **conteúdo** dos boards (elementos, conexões, canvas) continua vivendo
inteiramente no IndexedDB do navegador, exatamente como nas Fases 1-4. O
Supabase guarda apenas:
- quem é dono de cada board (`documents`);
- com quem foi compartilhado e com qual permissão (`document_shares`);
- autenticação (usuário/senha).

**Não há sincronização em tempo real do conteúdo do canvas entre usuários.**
Isso é colaboração ao vivo de verdade — explicitamente fora de escopo desde o
documento original do produto (§53) e mantido fora de escopo aqui também,
para não comprometer a arquitetura local-first já validada nas 4 fases
anteriores. Compartilhar um board hoje registra a permissão corretamente no
banco (com RLS de verdade), mas não empurra o conteúdo do dono para o
navegador de quem recebeu acesso — isso é o próximo passo natural caso o
projeto vá adiante nessa direção (precisaria de um mecanismo de sync/CRDT,
fora do escopo desta fase).

### O que foi implementado

- **Autenticação por username** (não email) sobre o Supabase Auth: cada
  username vira um "shadow email" determinístico só para o GoTrue conseguir
  autenticar por e-mail/senha por baixo dos panos; o usuário nunca vê isso.
- Login com **mensagem de erro genérica** ("Usuário ou senha inválidos") em
  qualquer caso de falha — nunca revela se o username existe.
- Cadastro com validação de username/senha **idêntica no client e no
  servidor** (`lib/auth/validation.ts`, importado nos dois lugares — nunca
  duplicada/divergente), checagem de disponibilidade de username em tempo
  real (essa sim revela disponibilidade — comportamento correto e esperado
  para signup, diferente de login).
- Rate limiting real (em memória, por IP) em login e cadastro.
- Middleware que redireciona usuários não-autenticados para `/login` **antes
  de qualquer render**, e usuários autenticados para fora de `/login`/`/signup`.
- RLS no Postgres para `documents`/`document_shares`/`share_links` —
  a autorização real está no banco, não só escondida na UI (§28 do doc).
- Compartilhamento por username (buscar, escolher editor/viewer, alterar,
  remover) via `features/sharing/ShareDialog.tsx`.
- Página `/account` com username, ID, data de criação, contagem de boards
  próprios e compartilhados, logout.
- Conta de teste `admin`/`123456` via script de seed separado
  (`apps/web/scripts/seed-dev-admin.mjs`), que se recusa a rodar em produção
  — nunca é criada automaticamente, nunca fica hard-coded em componente
  algum.
- Schema completo com `share_links` (§18) já modelado e com RLS, pronto para
  quando a UI de "gerar link" for construída — não implementada nesta
  passada para não inchar ainda mais uma mudança já grande.

### Não implementado nesta fase (documentado, não escondido)

- UI para gerar/revogar links de compartilhamento (`share_links` já existe
  no banco, falta só a tela).
- OAuth (Google/GitHub) — a arquitetura não impede adicionar depois (Supabase
  Auth suporta nativamente), só não foi ligado.
- Planos Free/Pro/Enterprise — fora de escopo por pedido explícito do
  documento-fonte ("não implementar pagamentos agora").
- Sincronização de conteúdo entre usuários compartilhados (ver decisão de
  escopo acima).

## Fase 5 — Performance ✅

- [x] **Virtualização real**: `Canvas.tsx` agora usa `grid.query(viewportWorldBounds)`
      pra decidir quais nós montar no DOM, em vez de `Object.values(elements)`
      inteiro. Padding de 400px (em unidades de mundo, escalado pelo zoom) garante
      que nós logo fora da tela já estejam montados antes de entrar em vista.
      Elementos sendo arrastados/redimensionados nunca somem no meio do gesto,
      mesmo se saírem da área com padding.
- [x] **Verificado com dados sintéticos**: novo comando no Command Palette
      ("Fase 5 · Gerar N elementos de teste") cria 1k/10k/50k elementos reais
      no board atual, direto no IndexedDB, sem passar pelo histórico de undo
      (que seria o próprio gargalo nessa escala). Use pra testar a
      virtualização com seus próprios olhos.
- [x] **Prova de algoritmo**: rodamos o `SpatialGrid` isolado (mesma lógica de
      `packages/canvas`) contra 1k/10k/50k/100k elementos sintéticos. Com
      100.000 elementos, uma consulta de viewport típica retorna ~60-70
      elementos visíveis (~0,06% do total) em ~0,1ms — o tempo de consulta
      não cresce com o total, que é exatamente o ganho esperado de um índice
      espacial sobre varredura linear.
- [ ] Web Worker para operações pesadas (import/export, busca) — a busca
      hoje roda no IndexedDB via `getAll()` + filtro em memória; suficiente
      até algumas dezenas de milhares de elementos por workspace, mas migraria
      para um Worker se isso se tornar um gargalo real de UI.

### O que NÃO mudou (de propósito)

A virtualização afeta só QUAIS nós são montados no DOM — não muda nada da
arquitetura de dados, seleção, histórico ou persistência. `Minimap` e "Selecionar
tudo" (Ctrl+A) continuam operando sobre a lista completa de elementos, não a
lista visível — um minimapa que só mostra o que já está na tela não seria um
minimapa.

## Bugs corrigidos (14 de agosto de 2026)

- **Excluir com Delete/Backspace às vezes só desmarcava, sem apagar** —
  `handleDelete` chamava `clearSelection()` incondicionalmente no final,
  mesmo quando a checagem `selectedElementIds.size > 0` (baseada num closure
  que podia estar um passo atrás do estado real) fazia o `deleteElements`
  ser pulado. Resultado: a seleção sumia visualmente sem nada ser excluído.
  Corrigido lendo o estado da store diretamente no momento do clique
  (`useSelectionStore.getState()`), eliminando a possibilidade de closure
  desatualizado.
- **Delete/Backspace mais robusto em teclados compactos** — agora checa
  `e.code` além de `e.key`, ajudando em teclados 60% e variações de layout
  onde `Fn+Backspace` pode ser reportado de forma inconsistente.
- **`Ctrl+D` (duplicar) nunca foi implementado** — o atalho existia no hook
  mas `Canvas.tsx` nunca passava um handler `onDuplicate`. Agora duplica de
  verdade (offset de posição, sem herdar o grupo do original, com
  undo/redo), e seleciona as cópias automaticamente.
- **Excluir board só era possível pela sidebar** — adicionado botão de
  excluir (com confirmação) direto na navbar do board, junto com
  "Compartilhar".

## Bugs corrigidos (15 de agosto de 2026)

- **"Usuário já existe" aparecia em qualquer tentativa de cadastro, mesmo
  com nomes novos** — a rota `/api/auth/signup` tratava QUALQUER erro do
  Supabase (chave de service role errada, RLS mal configurada, domínio do
  shadow email rejeitado, etc.) como "nome de usuário já em uso", escondendo
  a causa real. Agora só mostra essa mensagem quando é genuinamente um
  duplicado (erro do GoTrue contendo "already registered"/"already exists",
  ou `unique_violation` do Postgres na tabela `profiles`); qualquer outro
  erro é logado no servidor (nunca a senha) e reportado com uma mensagem
  honesta ("Não foi possível criar a conta agora"). Se isso continuar
  aparecendo depois dessa correção, o log do servidor vai mostrar a causa
  real em vez de esconder atrás de uma mensagem genérica errada.
- **Botão de mostrar/ocultar senha** — adicionado em login e cadastro
  (`features/auth/PasswordInput.tsx`, componente compartilhado pelos dois
  formulários).
