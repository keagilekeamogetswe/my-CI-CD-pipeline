import get_pods from "./actions/getpods.js";
import removePodRole from "./actions/remove.pod.role.js";
import set_pod_role from "./actions/set.pod.role.js";
import { k8s_api, namespace } from "./k8.object.interface.js";

const PodManager = (() => {
  const pod_labels = new Map();

  const prunePodData = (item) => {
    const { name } = item.metadata;
    const { role, app } = item.metadata.labels || {};
    const ip = item.status?.podIP;
    const status = item.status.phase;
    const containerStatuses = item.status.containerStatuses || [];
    const totalContainers = containerStatuses.length;
    const readyContainers = containerStatuses.filter(
      (c) => c.ready === true,
    ).length;
    const ready =
      totalContainers > 0 ? readyContainers / totalContainers === 1 : false;

    return { name, role, app, ip, status, ready };
  };

  return {
    getPods: async () => {
      const items = (await get_pods()) || [];
      pod_labels.clear();
      items.forEach((item) => {
        pod_labels.set(item.metadata.name, prunePodData(item));
      });
      return pod_labels;
    },
    prunePod: prunePodData,
    findAndPrunePodByName: async (pod_name) => {
      const res = await k8s_api.readNamespacedPod(pod_name, namespace);
      const pod = res.body;
      return prunePodData(pod);
    },
    removeRole: async (pod)=>await removePodRole(pod, "role"),
    setToPrimary: async (pod_dns_name) =>
      await set_pod_role(pod_dns_name, "primary"),

    setToReplica: async (pod_dns_name) =>
      await set_pod_role(pod_dns_name, "replica"),
  };
})();

export default PodManager;
