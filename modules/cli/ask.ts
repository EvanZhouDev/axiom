import { askAgent } from "../core/index.ts";
import type { CliMessageEvent } from "./index.ts";

const input = process.argv.slice(2).join(" ").trim() || (await Bun.stdin.text()).trim();

if (!input) {
  console.error("Usage: bun run ask \"message\"");
  process.exit(1);
}

const event: CliMessageEvent = {
  type: "cli.message",
  text: input,
  user: process.env.USER ?? "local",
};

const response = await askAgent(event);

if (response) {
  console.log(response);
}
