import {preparePwa} from "./prepare-pwa.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

if (command === "build") {
  // The framework CLI exits its process after building; keep post-build caching in this parent.
  const result = managedLinux
    ? spawnSync("bash", [fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args], {stdio:"inherit"})
    : spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url)), "build", ...args], {stdio:"inherit"});
  if (result.error) throw result.error;
  if(result.status===0)await preparePwa("dist/client");
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);

