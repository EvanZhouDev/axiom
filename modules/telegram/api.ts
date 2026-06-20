import { readSecret } from "../secrets/index.ts";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

let cachedToken: string | undefined;

export async function telegram<T>(method: string, query?: Record<string, string>, body?: unknown) {
  const token = await telegramToken();
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

export async function sendTelegramMessage(chatId: string, text: string) {
  await telegram("sendMessage", undefined, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function telegramToken() {
  cachedToken ??= await readSecret("telegram/bot-token");
  return cachedToken;
}
