# Nexus Note — o que falta fazer

## 1. Destravar o GitHub → Vercel (bloqueador atual)

O Vercel não está enxergando o conteúdo do repo — provavelmente porque a
integração GitHub→Vercel está restrita a "repositórios selecionados" e o
`Nexus-Note` não está na lista (ou é privado e a permissão não cobre ele).

1. Vá em **github.com/settings/installations**
2. Ache **Vercel** → **Configure**
3. Em "Repository access", marque **All repositories** (ou adicione
   `Nexus-Note` manualmente à lista)
4. Salvar

## 2. Confirmar que o código realmente foi enviado

Abra `github.com/Niclzrx/Nexus-Note` no navegador. Devem aparecer as pastas
`apps/`, `packages/`, `supabase/`, etc. Se estiver vazio, rode de novo dentro
da pasta extraída do zip:

```bash
git init
git add .
git commit -m "Nexus Note — local-first + auth Supabase"
git branch -M main
git remote add origin https://github.com/Niclzrx/Nexus-Note.git
git push -u origin main
```

Se `git remote add origin` reclamar que já existe, use
`git remote set-url origin https://github.com/Niclzrx/Nexus-Note.git` em vez
disso.

## 3. Me avisar pra eu reconectar o deploy

Depois dos passos 1 e 2, me chama que eu tento o `create_git_project` de novo
pelo Vercel MCP. Se continuar falhando, me manda o texto exato do erro.

## 4. Variáveis de ambiente no Vercel (antes do app funcionar em produção)

Painel do Vercel → projeto `nexus-note-web` → **Settings → Environment
Variables**, adicionar:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wctqiplybuamsvvcrmkn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (está em `apps/web/.env.local` no seu zip) |
| `SUPABASE_SERVICE_ROLE_KEY` | Pegar em Supabase → Project Settings → API |

## 5. Rodar localmente (pra testar antes/além do Vercel)

```bash
pnpm install
```

Em `apps/web/.env.local`, cole a `SUPABASE_SERVICE_ROLE_KEY` (as outras duas
já estão preenchidas — são a URL e a anon key do projeto Supabase que você
conectou, seguras de expor).

```bash
cd apps/web
pnpm seed:admin      # cria a conta de teste admin/123456
cd ../..
pnpm dev             # abre em localhost:3000
```

## 6. Testar (os 20 cenários do documento original)

**Autenticação**
- [ ] Login válido (`admin` / `123456`, depois de rodar o seed)
- [ ] Login com senha errada → mensagem genérica
- [ ] Login com usuário inexistente → mesma mensagem genérica (não deve
      revelar que o usuário não existe)
- [ ] Cadastro com username < 3 caracteres → erro
- [ ] Cadastro com senha < 6 caracteres → erro
- [ ] Cadastro com senha sem maiúscula → erro
- [ ] Cadastro com senha sem número → erro
- [ ] Cadastro válido → login automático, cai no dashboard
- [ ] Logout → volta pra `/login`
- [ ] Fechar e reabrir o navegador → sessão continua logada
- [ ] Acessar `/dashboard` sem estar logado → redireciona pra `/login`
      automaticamente, sem piscar a tela protegida

**Documentos / compartilhamento** (precisa de 2 contas — crie uma segunda
pelo `/signup`)
- [ ] Usuário A cria um board
- [ ] Usuário B tenta abrir a URL do board de A diretamente → não consegue
      (a UI ainda não tem uma tela de "sem permissão" dedicada — hoje ele só
      não vai ver o board na lista dele; isso é esperado, não é um bug)
- [ ] A compartilha o board com B como **viewer** (botão "Compartilhar" na
      navbar do board)
- [ ] B edita a permissão? Não deveria conseguir enquanto for viewer — hoje a
      trava real é a RLS no banco, a UI ainda não desabilita campos pra
      viewer (ver seção "Limitações" abaixo)
- [ ] A muda a permissão de B pra **editor**
- [ ] A remove o acesso de B → B perde o compartilhamento na lista

**Segurança**
- [ ] Tentar rodar a migration `.sql` duas vezes seguidas → não deve dar erro
      (é idempotente)
- [ ] Conferir no Supabase → Authentication → Users que a conta `admin` foi
      criada com o email sombra (`admin@users.nexusnote.internal`), não um
      email real

## Limitações conhecidas (não são bugs esquecidos — estão documentadas em
`docs/roadmap.md` dentro do zip)

- O conteúdo dos boards (notas, canvas) continua 100% local no navegador. O
  Supabase só sabe quem é dono e com quem foi compartilhado — **não** existe
  sincronização de conteúdo entre usuários ainda.
- A UI ainda não trava visualmente campos de edição pra quem tem permissão
  "viewer" — a autorização real já está garantida no banco (RLS), mas a
  interface do canvas em si não sabe diferenciar owner/editor/viewer ainda.
- Links de compartilhamento (`/share/<token>`) têm o schema pronto no banco,
  mas não têm tela ainda.
- Blobs de mídia (imagem/vídeo/PDF) não são apagados do IndexedDB quando o
  elemento é excluído — ficam órfãos. Documentado, não corrigido.

## Onde estão as coisas

- Zip do projeto: o que já te mandei nas mensagens anteriores
- Projeto Supabase: `nexus-note` (ref `wctqiplybuamsvvcrmkn`) — schema já
  aplicado e testado (RLS, advisors de segurança/performance limpos)
- Projeto Vercel: `nexus-note-web`, ligado a `github.com/Niclzrx/Nexus-Note`
- Migration: `supabase/migrations/0001_auth_and_sharing.sql` no zip — é
  exatamente o que está rodando no Supabase agora, não uma versão teórica
