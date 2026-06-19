import { askAgent } from "../core/index.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type Ingress = {
  text: string;
  userId: string;
  chatId: string;
};

type TelegramState = {
  offset?: number;
};

type TelegramConfig = {
  telegram?: {
    allowedUserIds?: string[];
    allowedChatIds?: string[];
  };
};

const rootDir = path.resolve(import.meta.dirname, "../../..");
const statePath = path.join(rootDir, ".axiom/telegram.json");
const configPath = path.join(rootDir, "config.json");
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

console.log("Axiom Telegram ingress started");

while (true) {
  try {
    await pollOnce();
  } catch (error) {
    console.error(error);
    await sleep(3000);
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

  if (!isAllowed(await readConfig(), ingress)) {
    console.warn(`Rejected Telegram update from user=${ingress.userId} chat=${ingress.chatId}`);
    return;
  }

  await askAgent({
    text: ingress.text,
    source: "telegram",
    actor: ingress.userId,
    onMessage: async (message) => {
      for (const chunk of chunks(message, 3900)) {
        await sendMessage(ingress.chatId, chunk);
      }
    },
  });
}

async function readState(): Promise<TelegramState> {
  const raw = await readText(statePath);
  return raw ? JSON.parse(raw) as TelegramState : {};
}

async function writeState(state: TelegramState) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function readConfig(): Promise<TelegramConfig> {
  const raw = await readText(configPath);
  return raw ? JSON.parse(raw) as TelegramConfig : {};
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

function isAllowed(config: TelegramConfig, ingress: Ingress) {
  const users = config.telegram?.allowedUserIds ?? [];
  const chats = config.telegram?.allowedChatIds ?? [];

  return (
    users.length > 0 &&
    chats.length > 0 &&
    users.includes(ingress.userId) &&
    chats.includes(ingress.chatId)
  );
}

function extractIngress(update: TelegramUpdate): Ingress | null {
  const message =
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post ??
    update.callback_query?.message;
  const user = update.callback_query?.from ?? update.inline_query?.from ?? message?.from;
  const text =
    message?.text ??
    message?.caption ??
    update.callback_query?.data ??
    update.inline_query?.query;

  if (!text?.trim() || user?.id === undefined || message?.chat?.id === undefined) {
    return null;
  }

  return {
    text: text.trim(),
    userId: String(user.id),
    chatId: String(message.chat.id),
  };
}

async function sendMessage(chatId: string, text: string) {
  await telegram("sendMessage", undefined, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function telegram<T>(method: string, query?: Record<string, string>, body?: unknown) {
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, body ? {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  const payload = (await response.json()) as TelegramResponse<T>;

  if (!payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} failed`);
  }

  return payload.result as T;
}

function chunks(text: string, size: number) {
  const safeText = text.trim() || "(no response)";
  const result: string[] = [];

  for (let index = 0; index < safeText.length; index += size) {
    result.push(safeText.slice(index, index + size));
  }

  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
