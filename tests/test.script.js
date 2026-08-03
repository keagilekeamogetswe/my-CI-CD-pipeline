import { readdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const IGNORED_DIRS = new Set([
  "deprecated",
  "node_modules",
  ".git",
  "microservices",
]);

async function runTest(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["vitest", "run", file],
      {
        stdio: "inherit",
        shell: true,
      },
    );

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} failed`));
    });
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  // Run files in this folder first
  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith(".test.js") &&
        e.name !== "test.script.js",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    console.log(`Running ${fullPath}`);
    await runTest(fullPath);
  }

  // Then recurse into subfolders
  const folders = entries
    .filter(
      (e) =>
        e.isDirectory() &&
        !IGNORED_DIRS.has(e.name) &&
        !e.name.startsWith("."),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const folder of folders) {
    await walk(path.join(dir, folder.name));
  }
}

await walk("tests");