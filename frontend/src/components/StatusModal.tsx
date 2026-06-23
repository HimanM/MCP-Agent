"use client";

import type { ReactNode } from "react";
import {
  Activity,
  Bot,
  Cpu,
  Globe,
  Mic,
  Package2,
  ServerCog,
  Volume2,
  X,
} from "lucide-react";
import type { BackendMeta } from "@/lib/api";
import type { UiLanguage } from "@/lib/ui-copy";

interface StatusModalProps {
  open: boolean;
  onClose: () => void;
  backendMeta: BackendMeta | null;
  sessionId: string;
  uiLanguage: UiLanguage;
  cartCount: number;
  voiceInputSupported: boolean;
  voiceRepliesEnabled: boolean;
  isListening: boolean;
  backupModelEnabled: boolean;
  onToggleBackupModel: () => void;
}

function StatusRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-accent">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default function StatusModal({
  open,
  onClose,
  backendMeta,
  sessionId,
  uiLanguage,
  cartCount,
  voiceInputSupported,
  voiceRepliesEnabled,
  isListening,
  backupModelEnabled,
  onToggleBackupModel,
}: StatusModalProps) {
  if (!open) return null;

  const effectiveModel = backupModelEnabled
    ? backendMeta?.openrouter.backup_model || "Unavailable"
    : backendMeta?.model || "Unavailable";
  const backupModel = backendMeta?.openrouter.backup_model || "";
  const defaultModel = backendMeta?.openrouter.default_model || "Unavailable";
  const backupAvailable = Boolean(backupModel);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-[rgba(37,24,18,0.24)] backdrop-blur-[3px]"
        aria-label="Close status panel"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Developer status"
        className="animate-pop-in fixed left-1/2 top-1/2 z-[100] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,239,231,0.98))] p-5 shadow-[0_28px_90px_rgba(65,38,19,0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Dev only</p>
            <h2 className="mimo-serif text-3xl leading-none text-ink">Runtime status</h2>
            <p className="mt-2 text-sm text-ink-soft">Hidden command surface for model and environment details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-ink-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <StatusRow icon={<Bot size={16} />} label="Provider" value={backendMeta?.provider || "Unavailable"} />
          <StatusRow icon={<Cpu size={16} />} label="Model" value={effectiveModel} />
          <div className="rounded-2xl border border-border bg-surface px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">OpenRouter backup</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {backupModelEnabled
                    ? backupModel || "Unavailable"
                    : defaultModel}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleBackupModel}
                disabled={!backupAvailable}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  backupModelEnabled
                    ? "bg-accent text-white"
                    : "border border-border bg-white text-ink-soft"
                } ${backupAvailable ? "" : "cursor-not-allowed opacity-50"}`}
              >
                {backupModelEnabled ? "Backup on" : "Backup off"}
              </button>
            </div>
          </div>
          <StatusRow
            icon={<ServerCog size={16} />}
            label="MCP connection"
            value={backendMeta ? (backendMeta.mcp.connected ? "Connected" : "Disconnected") : "Unavailable"}
          />
          <StatusRow
            icon={<Package2 size={16} />}
            label="MCP tools"
            value={backendMeta ? String(backendMeta.mcp.tool_count) : "Unavailable"}
          />
          <StatusRow icon={<Globe size={16} />} label="UI language" value={uiLanguage.toUpperCase()} />
          <StatusRow icon={<Activity size={16} />} label="Session" value={sessionId} />
          <StatusRow icon={<Package2 size={16} />} label="Cart items" value={String(cartCount)} />
          <StatusRow
            icon={<Mic size={16} />}
            label="Voice input"
            value={voiceInputSupported ? (isListening ? "Listening" : "Supported") : "Unsupported"}
          />
          <StatusRow
            icon={<Volume2 size={16} />}
            label="Voice replies"
            value={voiceRepliesEnabled ? "Speaking" : "Idle"}
          />
        </div>
      </section>
    </>
  );
}
