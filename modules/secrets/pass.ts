export async function readPassSecret(name: string) {
  assertSecretName(name);

  const command = process.env.AXIOM_PASS_COMMAND ?? "pass";
  const prefix = process.env.AXIOM_SECRET_PREFIX ?? "axiom";
  const proc = Bun.spawn([command, "show", `${prefix}/${name}`], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    const detail = stderr.trim() ? `: ${stderr.trim()}` : "";
    throw new Error(`Missing secret ${prefix}/${name}${detail}`);
  }

  return stdout.replace(/\s+$/, "");
}

function assertSecretName(name: string) {
  if (
    !name ||
    name.startsWith("/") ||
    name.includes("..") ||
    name.includes("\0")
  ) {
    throw new Error(`Invalid secret name: ${name}`);
  }
}
