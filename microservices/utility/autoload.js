// autoloader.js
import fs from "fs";
import path from "path";

/**
 * Automatically imports all JS files from a directory into an object
 * @param {string} dirPath - Full path to target folder
 * @returns {Promise<Object>} Object containing all loaded modules
 */
export async function autoload(dirPath) {
  const files = fs.readdirSync(dirPath);
  const modules = {};

  for (const file of files) {
    if (file.endsWith(".js") && !file.startsWith(".")) {
      const moduleName = path.parse(file).name;
      const filePath = path.join(dirPath, file);

      const moduleUrl = `file://${filePath}`;
      const loadedModule = await import(moduleUrl);
      modules[moduleName] = loadedModule.default || loadedModule;
    }
  }

  return modules;
}
