import { askAgent } from "../core/index.ts";
import { readSecret } from "../secrets/index.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { telegram } from "./api.ts";
import type { TelegramMessageEvent } from "./index.ts";

type TelegramUser = {
  id?: number;
  username?: string;
};

type TelegramChat = {
  id?: number;
  type?: string;
};

type TelegramMessage = {
  text?: string;
  caption?: string;
  from?: TelegramUser;
  chat?: TelegramChat;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: {
    data?: string;
    from?: TelegramUser;
    message?: TelegramMessage;
  };
  inline_query?: {
    query?: string;
    from?: TelegramUser;
  };
};

type Ingress = {
  event: TelegramMessageEvent;
  chatId: string;
  userId: string;
};

type TelegramState = {
  offset?: number;
};

const statePath = path.join(import.meta.dirname, "state.json");

const allowedUserIds = parseIdList(await readSecret("telegram/allowed-user-ids"));
const allowedChatIds = parseIdList(await readSecret("telegram/allowed-chat-ids"));

export async function startTelegramPolling() {
  console.log("Axiom Telegram ingress started");

  while (true) {
    try {
      await pollOnce();
    } catch (error) {
      console.error(error);
      await sleep(3000);
    }
  }
}

async function pollOnce() {
  const updates = await telegram<TelegramUpdate[]>("getUpdates", {
    timeout: "30",
    offset: String((await readState()).offset ?? 0),
  });

  for (const update of updates) {
    await writeState({ offset: update.update_id + 1 });
    await handleUpdate(update);
  }
}

async function handleUpdate(update: TelegramUpdate) {
  const ingress = extractIngress(update);

  if (!ingress) {
    return;
  }

  if (!isAllowed(ingress)) {
    console.warn(`Rejected Telegram update from user=${ingress.userId} chat=${ingress.chatId}`);
    return;
  }

  await askAgent(ingress.event);
}

async function readState(): Promise<TelegramState> {
  const raw = await readText(statePath);
  return raw ? JSON.parse(raw) as TelegramState : {};
}

async function writeState(state: TelegramState) {
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

function isAllowed(ingress: Ingress) {
  return (
    allowedUserIds.length > 0 &&
    allowedChatIds.length > 0 &&
    allowedUserIds.includes(ingress.userId) &&
    allowedChatIds.includes(ingress.chatId)
  );
}

function parseIdList(text: string) {
  return text
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractIngress(update: TelegramUpdate): Ingress | null {
  const messageEntry = messageEntryFor(update);
  const message = update.callback_query?.message ?? messageEntry?.message;
  const user = update.callback_query?.from ?? update.inline_query?.from ?? message?.from;
  const text =
    message?.text ??
    message?.caption ??
    update.callback_query?.data ??
    update.inline_query?.query;

  if (!text?.trim() || user?.id === undefined || message?.chat?.id === undefined) {
    return null;
  }

  const userId = String(user.id);
  const chatId = String(message.chat.id);

  return {
    event: {
      type: "telegram.message",
      text: text.trim(),
      updateId: update.update_id,
      messageKind: update.callback_query ? "callback_query" : messageEntry?.kind ?? "message",
      user: {
        id: userId,
        username: user.username,
      },
      chat: {
        id: chatId,
        type: message.chat.type,
      },
    },
    userId,
    chatId,
  };
}

function messageEntryFor(update: TelegramUpdate) {
  if (update.message) {
    return { kind: "message" as const, message: update.message };
  }
  if (update.edited_message) {
    return { kind: "edited_message" as const, message: update.edited_message };
  }
  if (update.channel_post) {
    return { kind: "channel_post" as const, message: update.channel_post };
  }
  if (update.edited_channel_post) {
    return { kind: "edited_channel_post" as const, message: update.edited_channel_post };
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
