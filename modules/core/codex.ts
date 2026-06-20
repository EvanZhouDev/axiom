import { Codex, type ApprovalMode, type SandboxMode } from "@openai/codex-sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentEvent } from "./index.ts";

type CoreState = {
  codexThreadId?: string;
};

const rootDir = path.resolve(import.meta.dirname, "../..");
const statePath = path.join(import.meta.dirname, "state.json");

const threadOptions = {
  workingDirectory: rootDir,
  skipGitRepoCheck: true,
  sandboxMode: "danger-full-access" as SandboxMode,
  approvalPolicy: "never" as ApprovalMode,
};

export async function runAgentTurn(event: AgentEvent) {
  const state = await readState();
  const prompt = JSON.stringify(event, null, 2);

  try {
    return await runCodex(prompt, state.codexThreadId);
  } catch (error) {
    if (!state.codexThreadId || !isMissingCodexThread(error)) {
      throw error;
    }

    await writeState({});
    return await runCodex(prompt, undefined);
  }
}

async function runCodex(
  prompt: string,
  codexThreadId: string | undefined,
) {
  const client = new Codex({ env: codexEnv() });
  const thread = codexThreadId
    ? client.resumeThread(codexThreadId, threadOptions)
    : client.startThread(threadOptions);
  const { events } = await thread.runStreamed(prompt);
  let finalMessage = "";

  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "agent_message") {
      finalMessage = event.item.text.trim();
    }

    if (event.type === "turn.failed") {
      throw new Error(event.error.message);
    }
  }

  if (thread.id && thread.id !== codexThreadId) {
    await writeState({ codexThreadId: thread.id });
  }

  return finalMessage;
}

async function readState(): Promise<CoreState> {
  const raw = await readText(statePath);
  return raw ? JSON.parse(raw) as CoreState : {};
}

async function writeState(state: CoreState) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function readText(file: string) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function isMissingCodexThread(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("thread/resume") && message.includes("no rollout found");
}

function codexEnv() {
  const env: Record<string, string> = {};

  for (const key of [
    "HOME",
    "PATH",
    "SHELL",
    "TERM",
    "TMPDIR",
    "USER",
    "LOGNAME",
    "CODEX_HOME",
    "CODEX_API_KEY",
    "OPENAI_API_KEY",
  ]) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }

  return env;
}
