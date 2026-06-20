import { readPassSecret } from "./pass.ts";

/**
 * Read one named Axiom secret from pass/GPG.
 *
 * Names are relative to the `axiom/` pass prefix, for example
 * `telegram/bot-token`. Callers should request only the exact secret they need
 * and must not print or return secret values to users.
 */
export async function readSecret(name: string) {
  return await readPassSecret(name);
}
