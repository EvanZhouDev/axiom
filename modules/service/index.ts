/**
 * A long-running process that can be installed as a systemd service.
 */
export type Service = {
  /** Human-readable unit description. */
  description: string;

  /** TypeScript entrypoint, relative to the Axiom repo root. */
  entrypoint: string;

  /** systemd units that should start before this service. */
  after?: string[];

  /** systemd units this service should request when it starts. */
  wants?: string[];

  /** systemd units that must be running for this service to run. */
  requires?: string[];
};

/**
 * Services known to the generic installer.
 *
 * Each key is the systemd unit base name. For example, `axiom.telegram`
 * creates `axiom.telegram.service`.
 */
export const services: Record<string, Service> = {
  "axiom.telegram": {
    description: "Axiom Telegram ingress",
    entrypoint: "modules/telegram/start.ts",
    after: ["network-online.target"],
    wants: ["network-online.target"],
  },
};
