/**
 * JSON event produced by the CLI ingress.
 */
export type CliMessageEvent = {
  type: "cli.message";
  text: string;
  user?: string;
};
