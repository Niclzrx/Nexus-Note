"use client";

import { useEffect, useState } from "react";
import { Button, IconButton } from "@nexus/design-system";
import { LogOut, User, Calendar, FileText, Users, Menu } from "lucide-react";
import { useAuth } from "../../../hooks/use-auth";
import { getDocumentCounts, type DocumentCounts } from "../../../lib/supabase/documents";
import { useUiStore } from "../../../stores/ui-store";

export default function AccountPage() {
  const { profile, loading, signOut } = useAuth();
  const [counts, setCounts] = useState<DocumentCounts | null>(null);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);

  useEffect(() => {
    if (!profile) return;
    void getDocumentCounts(profile.id).then(setCounts);
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Não foi possível carregar sua conta.
      </div>
    );
  }

  return (
    <div className="nx-scroll h-full overflow-y-auto">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <IconButton label="Abrir menu" className="shrink-0 md:hidden" onClick={toggleMobileSidebar}>
          <Menu />
        </IconButton>
        <h1 className="font-display text-lg font-semibold text-text sm:text-xl">Sua conta</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-signal/15 text-signal">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-text">{profile.username}</p>
            <p className="text-xs text-text-faint">{profile.id}</p>
          </div>
        </div>

        <dl className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <Row icon={Calendar} label="Conta criada em">
            {new Date(profile.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Row>
          <Row icon={FileText} label="Boards que você possui">
            {counts ? counts.owned : "…"}
          </Row>
          <Row icon={Users} label="Compartilhados com você">
            {counts ? counts.sharedWithMe : "…"}
          </Row>
        </dl>

        <p className="mt-6 text-xs text-text-faint">
          Alteração de senha, e-mail, avatar e plano chegam em versões futuras — a estrutura de conta já
          está pronta para isso (ver docs/roadmap.md).
        </p>

        <Button variant="secondary" className="mt-6" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-xs text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}
