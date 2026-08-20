import { k8s_watch, namespace } from "../../k8.object.interface.js";
import PodManager from "../../pod.manager.js";

// Specific container waiting reasons that indicate actual unrecoverable failure loops
const FATAL_WAITING_REASONS = new Set([
  "CrashLoopBackOff",
  "ImagePullBackOff",
  "ErrImagePull",
  "InvalidImageName",
  "CreateContainerConfigError",
]);

export function startMysqlPodWatcher() {
  const queryOptions = { labelSelector: "app=mysql" };
  const path = `/api/v1/namespaces/${namespace}/pods`;

  console.log(`[Watcher] Monitoring MySQL pods in namespace: ${namespace}`);

  k8s_watch.watch(
    path,
    queryOptions,
    async (type, podObj) => {
      const pod = PodManager.prunePod(podObj);
      // RE match if the pod name is mysql- followed by atleast one digit
      // Matches 'mysql-0', 'mysql-1', 'mysql-12', 'mysql-100', etc
      if (!/^mysql-\d+$/.test(pod.name)) {
        console.log("Pod not of interest: ", pod.name);
        return;
      }

      const containerStatuses = podObj.status?.containerStatuses || [];
      const totalContainers = containerStatuses.length;
      const readyContainers = containerStatuses.filter(
        (c) => c.ready === true,
      ).length;

      // 1. Intercept DELETED Pods
      if (type === "DELETED") {
        console.warn(`🚨 [Watcher] Pod ${pod.name} was deleted.`);
        if (process.send) {
          process.send({ event: "DELETED", pod });
        }
        return;
      }

      // 2. Intercept READY Pods (Evaluate BEFORE error checks to prevent false positives)
      if (pod.ready) {
        console.log(
          `[Watcher] Pod ${pod.name} is READY (${readyContainers}/${totalContainers}).`,
        );
        if (process.send) {
          process.send({ event: "READY", pod });
        }
        return;
      }

      // 3. Intercept ACTUAL Errors (Ignores standard startup states like ContainerCreating)
      const hasFatalErrors = containerStatuses.some((c) => {
        const waitingReason = c.state?.waiting?.reason;
        const terminatedExitCode = c.state?.terminated?.exitCode;
        return (
          FATAL_WAITING_REASONS.has(waitingReason) ||
          (terminatedExitCode !== undefined && terminatedExitCode !== 0)
        );
      });

      if (pod.status === "Failed" || hasFatalErrors) {
        console.error(
          `[Watcher] Pod ${pod.name} entered an unhealthy state.`,
        );
        containerStatuses.forEach((c) => {
          if (
            c.state?.waiting &&
            FATAL_WAITING_REASONS.has(c.state.waiting.reason)
          ) {
            console.error(`   -> Container Reason: ${c.state.waiting.reason}`);
          }
          if (c.state?.terminated && c.state.terminated.exitCode !== 0) {
            console.error(
              `   -> Container Exit Code: ${c.state.terminated.exitCode}`,
            );
          }
        });

        if (process.send) {
          process.send({ event: "ERROR", pod });
        }
        return;
      }
    },
    (err) => {
      if (err)
        console.error(`[Disconnect] Watch stream dropped: ${err.message}`);
      console.log(
        "[Disconnect] Re-establishing MySQL watch stream in 5 seconds...",
      );
      setTimeout(startMysqlPodWatcher, 5000);
    },
  );
}

// Start watching immediately when spawned
startMysqlPodWatcher();
