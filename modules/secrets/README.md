# Secrets

Reads named secrets through `pass`, the GPG-backed password store.

`index.ts` is the public callable surface.

Manual setup:

```sh
gpg --full-generate-key
pass init "<your-gpg-key-id>"
pass insert axiom/telegram/bot-token
pass insert axiom/telegram/allowed-user-ids
pass insert axiom/telegram/allowed-chat-ids
```

Code should request only the exact secret it needs:

```ts
await readSecret("telegram/bot-token");
```

Do not print secret values, or store them outside of `pass`.
