// backend/runners/execRunner.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

const TEMP_ROOT = path.join(process.cwd(), "temp_runs");
if (!fs.existsSync(TEMP_ROOT)) fs.mkdirSync(TEMP_ROOT, { recursive: true });

/**
 * runProjectStream
 * - files: [{ name: "src/index.js", content: "..." }, ...]
 * - entry: path relative to project root, e.g. "index.js" or "src/main.cpp"
 * - language: "javascript" | "python" | "cpp" | "java"
 * - socket: socket to emit events to
 * - runId: id for this run (used in events)
 * - timeout: ms before hard kill
 */
export function runProjectStream({ files, entry, language, socket, runId = uuidv4(), timeout = 15000 }) {
  const runDir = path.join(TEMP_ROOT, runId);
  fs.mkdirSync(runDir, { recursive: true });

  try {
    // write files to disk preserving directories
    for (const f of files || []) {
      // sanitize filename a bit (no absolute paths)
      const safeName = f.name.replace(/^\/+/, "");
      const target = path.join(runDir, safeName);
      const dirname = path.dirname(target);
      if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
      fs.writeFileSync(target, f.content ?? "", "utf8");
    }

    // prepare command for different languages
    let command;
    let args = [];
    let opts = { cwd: runDir, env: { ...process.env } };

    if (language === "javascript") {
      command = "node";
      args = [entry];
    } else if (language === "python") {
      command = "python";
      args = [entry];
    } else if (language === "cpp") {
      // compile then run
      // compile to ./a.out inside runDir
      command = "bash";
      args = ["-lc", `g++ "${entry}" -O2 -std=c++17 -o a.out && ./a.out`];
    } else if (language === "java") {
      // compile all java files then run Main (caller should ensure Main exists)
      command = "bash";
      args = ["-lc", `javac $(find . -name "*.java") && java -cp . Main`];
    } else {
      socket.emit("run-output", { runId, text: `Unsupported language: ${language}\n` });
      socket.emit("run-finished", { runId, code: 1, timedOut: false });
      cleanup();
      return;
    }

    socket.emit("run-started", { runId });

    const proc = spawn(command, args, opts);

    const killTimer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch (e) {}
      socket.emit("run-output", { runId, text: "\nProcess killed: timeout\n" });
      socket.emit("run-finished", { runId, code: null, timedOut: true });
      cleanup();
    }, timeout);

    proc.stdout.on("data", (d) => {
      socket.emit("run-output", { runId, text: d.toString() });
    });

    proc.stderr.on("data", (d) => {
      socket.emit("run-output", { runId, text: d.toString(), isErr: true });
    });

    proc.on("close", (code, signal) => {
      clearTimeout(killTimer);
      socket.emit("run-output", { runId, text: `\nProcess exited with code ${code}\n` });
      socket.emit("run-finished", { runId, code, timedOut: false, signal });
      cleanup();
    });

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      socket.emit("run-output", { runId, text: `\nProcess error: ${err.message}\n` });
      socket.emit("run-finished", { runId, code: 1, timedOut: false });
      cleanup();
    });

  } catch (err) {
    socket.emit("run-output", { runId, text: `\nRunner error: ${String(err)}\n` });
    socket.emit("run-finished", { runId, code: 1, timedOut: false });
    cleanup();
  }

  function cleanup() {
    // best-effort remove temporary directory (non-blocking)
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
  }
}
