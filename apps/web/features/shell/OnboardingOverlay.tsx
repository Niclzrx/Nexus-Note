"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Panel } from "@nexus/design-system";
import { Link2, MousePointer2, StickyNote, Sparkles } from "lucide-react";

const STORAGE_KEY = "nexus-onboarding-dismissed";

const steps = [
  {
    icon: StickyNote,
    title: "Crie qualquer tipo de conteúdo",
    body: "Notas, tarefas, links e mais — cada um vira um card no seu canvas infinito.",
  },
  {
    icon: Link2,
    title: "Conecte ideias",
    body: "Arraste do ícone de link em qualquer card até outro para criar uma conexão.",
  },
  {
    icon: MousePointer2,
    title: "Navegue livremente",
    body: "Scroll para navegar, Ctrl/Cmd+Scroll para zoom, e Espaço+arraste para mover a mão.",
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Panel elevated className="w-[440px] p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-signal/15 text-signal">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-text">Bem-vindo ao Nexus Note</h2>
              <p className="mt-1 text-sm text-text-muted">Organize ideias. Conecte conhecimento.</p>

              <div className="mt-5 space-y-4">
                {steps.map((step) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-text-muted">
                      <step.icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text">{step.title}</p>
                      <p className="text-xs text-text-muted">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="mt-6 w-full" onClick={dismiss}>
                Começar
              </Button>
            </Panel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
