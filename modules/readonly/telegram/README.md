# Telegram

Readonly ingress module.

Runs a Telegram long-polling loop. It owns Telegram state in `.axiom/telegram.json` and checks Telegram allowlists in `config.json` before sending text to core.

Telegram forwards Codex `agent_message` output only.

Ingress extraction accepts text/caption-bearing Telegram updates, edited messages, callback data, and inline query text when Telegram provides enough chat/user context.

Required environment:

```txt
TELEGRAM_BOT_TOKEN
```

Run locally:

```sh
TELEGRAM_BOT_TOKEN=... bun run telegram
```

Telegram is denied when either allowlist in `config.json` is empty.
