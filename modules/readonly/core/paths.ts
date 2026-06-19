import path from "node:path";

export const rootDir = path.resolve(import.meta.dirname, "../../..");
export const workspaceDir = path.join(rootDir, "modules/writable");
export const runtimeDir = path.join(rootDir, ".axiom");
export const coreStatePath = path.join(runtimeDir, "core.json");
export const instructionsPath = path.join(rootDir, "AGENTS.md");
