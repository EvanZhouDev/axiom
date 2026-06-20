import { sendTelegramMessage } from "./api.ts";

/**
 * JSON event produced by the Telegram ingress.
 */
export type TelegramMessageEvent = {
  type: "telegram.message";
  text: string;
  updateId: number;
  messageKind: "message" | "edited_message" | "channel_post" | "edited_channel_post" | "callback_query";
  user: {
    id: string;
    username?: string;
  };
  chat: {
    id: string;
    type?: string;
  };
};

/**
 * Telegram destination for explicit outbound messages.
 */
export type TelegramTarget = {
  /** Numeric Telegram chat ID as a string. */
  chatId: string;
};

/**
 * Send a message to Telegram.
 *
 * Use this when Axiom intentionally wants to contact a Telegram chat. The
 * Telegram bot token is loaded internally from the secrets module and should
 * never be printed or returned.
 */
export async function sendMessage(target: TelegramTarget, text: string) {
  for (const chunk of chunks(text, 3900)) {
    await sendTelegramMessage(target.chatId, chunk);
  }
}

function chunks(text: string, size: number) {
  const safeText = text.trim() || "(no response)";
  const result: string[] = [];

  for (let index = 0; index < safeText.length; index += size) {
    result.push(safeText.slice(index, index + size));
  }

  return result;
}
