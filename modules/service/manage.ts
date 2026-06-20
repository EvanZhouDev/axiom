import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { services, type Service } from "./index.ts";

const command = process.argv[2] ?? "start";
const serviceName = process.argv[3] ?? "axiom.telegram";
const service = services[serviceName];

if (!service) {
  fail(`Unknown service: ${serviceName}`);
}

if (command === "start") {
  await start(serviceName, service);
} else if (command === "stop") {
  requireRoot();
  await systemctl("stop", unitName(serviceName));
  console.log(`Stopped ${unitName(serviceName)}`);
} else if (command === "restart") {
  await restart(serviceName, service);
} else if (command === "uninstall") {
  requireRoot();
  await systemctl("disable", "--now", unitName(serviceName));
  await Bun.$`rm -f ${unitPath(serviceName)}`;
  await systemctl("daemon-reload");
  console.log(`Removed ${unitName(serviceName)}`);
} else if (command === "status") {
  requireRoot();
  await systemctl("status", unitName(serviceName));
} else {
  fail(`Usage: bun modules/service/manage.ts [start|stop|restart|status|uninstall] [${Object.keys(services).join("|")}]`);
}

async function start(serviceName: string, service: Service) {
  await installOrUpdate(serviceName, service);
  await systemctl("start", unitName(serviceName));
  console.log(`Started ${unitName(serviceName)}`);
}

async function restart(serviceName: string, service: Service) {
  await installOrUpdate(serviceName, service);
  await systemctl("restart", unitName(serviceName));
  console.log(`Restarted ${unitName(serviceName)}`);
}

async function installOrUpdate(serviceName: string, service: Service) {
  requireRoot();

  const rootDir = path.resolve(import.meta.dirname, "../..");
  const bunPath = process.env.BUN?.trim() || await commandPath("bun");
  const runUser = process.env.AXIOM_RUN_USER ?? process.env.SUDO_USER;
  if (!runUser || runUser === "root") {
    fail("Run with sudo from your normal Pi user, or set AXIOM_RUN_USER.");
  }

  const runHome = (await Bun.$`getent passwd ${runUser} | cut -d: -f6`.text()).trim();
  if (!runHome) {
    fail(`Could not find home directory for ${runUser}`);
  }

  const unit = `[Unit]
Description=${service.description}
${unitDependencyLines(service)}

[Service]
User=${runUser}
WorkingDirectory=${rootDir}
Environment=HOME=${runHome}
Environment=SHELL=/bin/bash
Environment=USER=${runUser}
Environment=LOGNAME=${runUser}
ExecStart=${bunPath} ${path.join(rootDir, service.entrypoint)}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

  await mkdir("/etc/systemd/system", { recursive: true });
  await writeFile(unitPath(serviceName), unit);
  await systemctl("daemon-reload");
  await systemctl("enable", unitName(serviceName));
}

function unitDependencyLines(service: Service) {
  const lines: string[] = [];

  if (service.after?.length) {
    lines.push(`After=${service.after.join(" ")}`);
  }

  if (service.wants?.length) {
    lines.push(`Wants=${service.wants.join(" ")}`);
  }

  if (service.requires?.length) {
    lines.push(`Requires=${service.requires.join(" ")}`);
  }

  return lines.join("\n");
}

async function commandPath(command: string) {
  const result = await Bun.$`command -v ${command}`.quiet().text();
  const resolved = result.trim();
  if (!resolved) {
    fail(`${command} was not found`);
  }
  return resolved;
}

async function systemctl(...args: string[]) {
  const proc = Bun.spawn(["systemctl", ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    process.exit(code);
  }
}

function unitName(serviceName: string) {
  return `${serviceName}.service`;
}

function unitPath(serviceName: string) {
  return `/etc/systemd/system/${unitName(serviceName)}`;
}

function requireRoot() {
  if (process.getuid?.() !== 0) {
    fail("Run with sudo.");
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
