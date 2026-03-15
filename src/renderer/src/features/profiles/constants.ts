import type { ProviderId } from "../../../../shared/contracts";
import { DEFAULT_PROFILE_PORT_START } from "../../../../shared/defaults";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  protocol: string;
  defaultPort: number;
  defaultUrl: string;
  envVar: string;
  clientName: string;
  badgeLabel: string;
  badgeVariant: "brand" | "success";
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Claude Code",
    protocol: "Anthropic Messages API",
    defaultPort: DEFAULT_PROFILE_PORT_START,
    defaultUrl: "https://api.anthropic.com",
    envVar: "ANTHROPIC_BASE_URL",
    clientName: "Claude Code",
    badgeLabel: "AN",
    badgeVariant: "brand",
  },
  {
    id: "codex",
    label: "Codex CLI",
    protocol: "OpenAI Responses API",
    defaultPort: DEFAULT_PROFILE_PORT_START + 1,
    defaultUrl: "https://chatgpt.com/backend-api/codex",
    envVar: "OPENAI_BASE_URL",
    clientName: "Codex CLI",
    badgeLabel: "CX",
    badgeVariant: "success",
  },
];
