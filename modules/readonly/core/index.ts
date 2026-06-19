import { Codex, type ApprovalMode, type SandboxMode } from "@openai/codex-sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { coreStatePath, instructionsPath, workspaceDir } from "./paths.ts";

type CoreState = {
  codexThreadId?: string;
};

export type AskAgentInput = {
  text: string;
  source: string;
  actor?: string;
  onMessage?: (text: string) => void | Promise<void>;
};

export async function askAgent(input: AskAgentInput) {
  const state = await readState();
  await mkdir(workspaceDir, { recursive: true });

  const client = new Codex({ env: codexEnv() });
  const thread = state.codexThreadId
    ? client.resumeThread(state.codexThreadId, threadOptions)
    : client.startThread(threadOptions);
  const { events } = await thread.runStreamed(await promptFor(input));
  let finalMessage = "";

  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "agent_message") {
      finalMessage = event.item.text.trim();
      if (finalMessage) {
        await input.onMessage?.(finalMessage);
      }
    }

    if (event.type === "turn.failed") {
      throw new Error(event.error.message);
    }
  }

  if (thread.id && thread.id !== state.codexThreadId) {
    await writeState({ codexThreadId: thread.id });
  }

  return finalMessage;
}

const threadOptions = {
  workingDirectory: workspaceDir,
  skipGitRepoCheck: true,
  sandboxMode: "workspace-write" as SandboxMode,
  approvalPolicy: "never" as ApprovalMode,
};

async function promptFor(input: AskAgentInput) {
  const instructions = await readText(instructionsPath);
  const actor = input.actor ? `\nActor: ${input.actor}` : "";
  const prefix = instructions ? `Standing instructions:\n${instructions}\n\n` : "";

  return `${prefix}Source: ${input.source}${actor}
Editable workspace: ${workspaceDir}

User message:
${input.text}`;
}

async function readState(): Promise<CoreState> {
  const raw = await readText(coreStatePath);
  return raw ? JSON.parse(raw) as CoreState : {};
}

async function writeState(state: CoreState) {
  await mkdir(path.dirname(coreStatePath), { recursive: true });
  await writeFile(coreStatePath, `${JSON.stringify(state, null, 2)}\n`);
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

function codexEnv() {
  const env: Record<string, string> = {};

  for (const key of ["HOME", "PATH", "SHELL", "TERM", "TMPDIR", "USER", "LOGNAME"]) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }

  return env;
}
