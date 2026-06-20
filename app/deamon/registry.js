// registry.js
import path from "path";
import { fileURLToPath } from "url";
import { autoload } from "../utility/autoload";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Registry {
  constructor(actionsDir = "actions") {
    this.actionsDir = path.join(__dirname, actionsDir);
    this.jobs = {};
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    const modules = await autoload(this.actionsDir);

    for (const actionModule of Object.values(modules)) {
      const { namespace, rules, requirement, ...handlers } = actionModule;

      for (const [actionName, handlerFn] of Object.entries(handlers)) {
        const jobName = `${namespace}.${actionName}`;
        const handler_interception = async () => {
          try {
            const intrinsic = await handlerFn();
            return { intrinsic, success: true };
          } catch (e) {
            return { success: false, intrinsic: e };
          }
        };
        this.jobs[jobName] = {
          handler: handler_interception,
          rules: rules[actionName] || {},
          requirement: requirement?.[actionName] || {},
        };
      }
    }

    this.loaded = true;
  }

  getJob(jobName) {
    if (!this.jobs[jobName]) {
      throw new Error(`Job ${jobName} not found`);
    }

    return this.jobs[jobName];
  }
}

const registry = new Registry();
await registry.load();

export default registry;
