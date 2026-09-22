"use client";

import { useEffect, useRef, useState } from "react";
import type { IDisposable, IWorkbookData } from "@univerjs/core";
import type { FWorkbook } from "@univerjs/preset-sheets-core";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCorePtBR from "@univerjs/preset-sheets-core/locales/pt-BR";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import "@univerjs/preset-sheets-core/lib/index.css";

const SAVE_DEBOUNCE_MS = 1200;
const SAVED_MESSAGE_MS = 2000;

export function UniverSheetEditor({
  sheetId,
  initialSnapshot,
}: {
  sheetId: string;
  initialSnapshot: IWorkbookData;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const saveNowRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const container = document.createElement("div");
    container.style.height = "100%";
    host.append(container);

    const ptBR = mergeLocales(UniverPresetSheetsCorePtBR) as Record<string, Record<string, unknown>>;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.PT_BR,
      locales: {
        [LocaleType.PT_BR]: {
          ...ptBR,
          // Corrige chaves de tradução ausentes nesta versão do Univer
          // (o aviso "valor guardado como texto" vem sem traducao, ver
          // @univerjs/sheets-ui@0.25.1 lib/es/index.js).
          "sheets-ui": {
            ...ptBR["sheets-ui"],
            info: {
              ...(ptBR["sheets-ui"]?.info as Record<string, string> | undefined),
              error: "Erro",
              forceStringInfo: "Número armazenado como texto",
            },
          },
        },
      },
      presets: [UniverSheetsCorePreset({ container })],
    });

    const fWorkbook = univerAPI.createWorkbook(initialSnapshot) as FWorkbook;

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let savedMessageTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void persist();
      }, SAVE_DEBOUNCE_MS);
    }

    async function persist() {
      if (disposed) return;
      if (saveTimer) clearTimeout(saveTimer);
      setStatus("saving");
      try {
        const snapshot = fWorkbook.save();
        const response = await fetch(`/api/sheets/${sheetId}/save`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
        if (!response.ok) throw new Error("Falha ao salvar.");
        if (disposed) return;
        setStatus("saved");
        if (savedMessageTimer) clearTimeout(savedMessageTimer);
        savedMessageTimer = setTimeout(() => {
          if (!disposed) setStatus("idle");
        }, SAVED_MESSAGE_MS);
      } catch {
        if (!disposed) setStatus("error");
      }
    }

    saveNowRef.current = () => {
      void persist();
    };

    const disposable: IDisposable = fWorkbook.onCommandExecuted(() => {
      scheduleSave();
    });

    return () => {
      disposed = true;
      if (saveTimer) clearTimeout(saveTimer);
      if (savedMessageTimer) clearTimeout(savedMessageTimer);
      disposable.dispose();
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, [sheetId, initialSnapshot]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-end gap-2">
        <span className="mr-auto text-xs text-gray-400">
          {status === "saving" && "Salvando..."}
          {status === "saved" && (
            <span className="text-brand-600">Alterações salvas.</span>
          )}
          {status === "error" && (
            <span className="text-red-600">Falha ao salvar as últimas alterações.</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => saveNowRef.current()}
          disabled={status === "saving"}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          Salvar
        </button>
        <a
          href={`/api/sheets/${sheetId}/export`}
          className="rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
        >
          Exportar .xlsx
        </a>
      </div>
      <div
        ref={hostRef}
        className="min-h-0 flex-1 overflow-hidden rounded-lg border border-brand-100"
      />
    </div>
  );
}
