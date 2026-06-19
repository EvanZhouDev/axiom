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

## Raspberry Pi Setup

On a Raspberry Pi, make the repo root, `package.json`, `config.json`, and `modules/readonly` root-owned and not writable by the service user. Make only `modules/writable` and `.axiom` writable by the service user.
