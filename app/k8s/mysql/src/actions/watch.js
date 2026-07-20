import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const watch = new k8s.Watch(kc);

const NAMESPACE = "social-networks";

export type PodEventType = "ADDED" | "MODIFIED" | "DELETED";

export type PodEventHandler = (
  event: PodEventType,
  pod: k8s.V1Pod
) => void | Promise<void>;

async function start(handler: PodEventHandler) {
  console.log("Watching MySQL Pods...");

  await watch.watch(
    `/api/v1/namespaces/${NAMESPACE}/pods`,
    {
      labelSelector: "app=mysql",
    },
    async (type, pod: k8s.V1Pod) => {
      try {
        console.log(
          `[${type}] ${pod.metadata?.name}`
        );

        await handler(type as PodEventType, pod);
      } catch (err) {
        console.error(err);
      }
    },
    (err) => {
      if (err) {
        console.error("Watch terminated:", err);
      } else {
        console.log("Watch closed.");
      }
    }
  );
}

export default {
  start,
};