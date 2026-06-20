# Service

Manages long-running Axiom processes as systemd services.

`index.ts` defines available services and their systemd dependencies. `manage.ts` starts/stops/restarts them.

The default service is `axiom.telegram.service`. It runs the Telegram ingress process at `modules/telegram/start.ts`.

```sh
bun run service:start
bun run service:restart
bun run service:stop
bun run service:status
```

The service runs as the normal Pi user and uses that user's Bun, Codex login, GPG key, and `pass` store.
