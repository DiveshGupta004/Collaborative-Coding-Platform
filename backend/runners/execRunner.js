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
 * - entry: "index.js" or "src/main.cpp"
 * - language: "javascript" | "python" | "cpp" | "java"
 * - runId: unique execution ID
 * - timeout: execution time limit
 * - onStdout(text)
 * - onStderr(text)
 * - onClose(exitCode)
 */
export function runProjectStream({
  files,
  entry,
  language,
  runId = uuidv4(),
  timeout = 15000,
  onStdout = () => {},
  onStderr = () => {},
  onClose = () => {},
}) {

  const runDir = path.join(TEMP_ROOT, runId);
  fs.mkdirSync(runDir, { recursive: true });

  try {
    // Write files to temp execution folder
    for (const f of files || []) {
      const safeName = f.name.replace(/^\/+/, "");
      const filePath = path.join(runDir, safeName);

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, f.content ?? "", "utf8");
    }

    // 🔧 Select command based on language
    let command;
    let args = [];

    if (language === "javascript") {
      command = "node";
      args = [entry];
    } else if (language === "python") {
      command = "python";
      args = [entry];
    } else if (language === "cpp") {
      command = "bash";
      args = ["-lc", `g++ "${entry}" -O2 -std=c++17 -o a.out && ./a.out`];
    } else if (language === "java") {
      command = "bash";
      args = ["-lc", `javac $(find . -name "*.java") && java -cp . Main`];
    } else {
      onStderr(`❌ Unsupported language: ${language}\n`);
      onClose(1);
      cleanup(runDir);
      return;
    }

    // Run with live stream
    const proc = spawn(command, args, { cwd: runDir });

    // Kill if too long
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      onStderr("\n⛔ Execution stopped: timeout exceeded\n");
      onClose(null);
      cleanup(runDir);
    }, timeout);

    // Output handling
    proc.stdout.on("data", (d) => onStdout(d.toString()));
    proc.stderr.on("data", (d) => onStderr(d.toString()));

    proc.on("close", (code) => {
      clearTimeout(timer);
      onStdout(`\n✔ Process finished with exit code: ${code}\n`);
      onClose(code);
      cleanup(runDir);
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      onStderr(`❌ Runtime error: ${err.message}\n`);
      onClose(1);
      cleanup(runDir);
    });

  } catch (err) {
    onStderr(`❌ Runner Error: ${err.message}\n`);
    onClose(1);
    cleanup(runDir);
  }
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}
