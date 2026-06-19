import { askAgent } from "../core/index.ts";

const input = await readInput();

if (!input.trim()) {
  console.error("usage: bun run ask \"message\"");
  process.exit(1);
}

await askAgent({
  text: input.trim(),
  source: "cli",
  actor: process.env.USER ?? "local",
  onMessage: (message) => {
    console.log(message);
  },
});

async function readInput() {
  const args = process.argv.slice(2).join(" ");

  if (args.trim()) {
    return args;
  }

  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}
