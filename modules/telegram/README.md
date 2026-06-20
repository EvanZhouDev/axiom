# Telegram

Telegram ingress for Axiom.

It polls Telegram, checks pass-backed allowlists, and sends allowed messages to core.

Replies are explicit: Codex uses `sendMessage` from `index.ts` when it wants to respond on Telegram.

`index.ts` exports the callable Telegram API. `start.ts` starts polling.

State is stored in `modules/telegram/state.json`.

Secrets:

```sh
pass insert axiom/telegram/bot-token
pass insert axiom/telegram/allowed-user-ids
pass insert axiom/telegram/allowed-chat-ids
```

Allowlist secrets can contain one ID or many IDs separated by newlines, spaces, or commas.

Run:

```sh
bun run telegram
```
