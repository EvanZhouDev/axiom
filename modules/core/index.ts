import { runAgentTurn } from "./codex.ts";
import type { CliMessageEvent } from "../cli/index.ts";
import type { TelegramMessageEvent } from "../telegram/index.ts";

/**
 * JSON event sent to Codex from an ingress module.
 */
export type AgentEvent = CliMessageEvent | TelegramMessageEvent;

/**
 * Run one JSON event through the Axiom agent.
 *
 * This triggers Codex and returns the final Codex-authored message, if there is
 * one. Ingress modules do not automatically forward that message anywhere.
 * Codex should use module APIs, such as Telegram `sendMessage`, when it wants
 * to perform an external action.
 */
export async function askAgent(event: AgentEvent) {
  return await runAgentTurn(event);
}
