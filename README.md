# Axiom

Axiom is a minimal Codex-backed personal agent.

## Shape

```txt
axiom/
  README.md
  AGENTS.md
  package.json

  modules/
    core/
      index.ts
      codex.ts
      state.json
      README.md

    telegram/
      index.ts
      start.ts
      poll.ts
      api.ts
      state.json
      README.md

    secrets/
      index.ts
      pass.ts
      README.md

    cli/
      index.ts
      ask.ts
      README.md

    service/
      index.ts
      manage.ts
      README.md
```

Module convention: `index.ts` is the public callable surface and should have clear JSDoc for exported types/functions. Other files are named by what they do.

Ingress modules do not automatically forward Codex output. Codex must manually send messages back to the ingress sources.

## Secrets

Axiom uses `pass`, the GPG-backed password store.

Install and initialize `pass` on the Pi:

```sh
sudo apt install pass
gpg --full-generate-key
pass init "<your-gpg-key-id>"
```

Add the Telegram secrets:

```sh
pass insert axiom/telegram/bot-token
pass insert axiom/telegram/allowed-user-ids
pass insert axiom/telegram/allowed-chat-ids
```

The allowlist secrets can contain one ID or many IDs separated by newlines, spaces, or commas.

For unattended boot, use a dedicated Axiom GPG key without a passphrase, or make sure `gpg-agent` can unlock the key for the service.

Modules read only the named secret they need through `modules/secrets`.

## Local Use

Install dependencies:

```sh
bun install
```

Ask through the CLI ingress:

```sh
bun run ask "what is your status?"
```

## Service

Start the optional systemd service:

```sh
bun run service:start
```

Restart, stop, or check it:

```sh
bun run service:restart
bun run service:stop
bun run service:status
```
