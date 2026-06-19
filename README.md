# Axiom

Axiom is a minimal Codex-backed agent.

## Shape

```txt
axiom/
  README.md
  AGENTS.md
  package.json
  config.json

  modules/
    readonly/
      core/
      cli/
      telegram/

    writable/
```

`modules/readonly` is trusted code. It receives outside input, checks trust, and talks to Codex.

`modules/writable` is the agent growth area. New capabilities belong there.

Runtime state is created under `.axiom/`.

## Local Use

Install dependencies:

```sh
bun install
```

Ask through the CLI ingress:

```sh
bun run ask "what is your status?"
```

Run Telegram polling:

```sh
TELEGRAM_BOT_TOKEN=... bun run telegram
```

Edit `config.json` before using Telegram. Telegram denies everyone when the allowlists are empty.

Telegram sends only Codex-authored messages back to chat.

## Raspberry Pi Setup

Make sure `.env` and `config.json` exist (see `.env.example` and `config.example.json`), then run:

```sh
bun run setup:pi
```

It does the following:

- Creates a restricted `axiom` service user
- Gives `axiom` ownership of only `.axiom` and `modules/writable`
- Locks `modules/readonly` against `axiom` edits
- Installs the `axiom-telegram` systemd service
- Enables the service so it starts on boot

Start the service:

```sh
sudo systemctl start axiom-telegram
```

Check that it's live:

```sh
sudo systemctl status axiom-telegram
```
