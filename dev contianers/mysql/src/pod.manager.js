import get_pods from "./actions/getpods.js";
import set_pod_role from "./actions/set.pod.role.js";
import { k8s_api, namespace } from "./k8.object.interface.js";

const PodManager = (() => {
  const pod_labels = new Map();
  return {
    getPods: async () => {
      const items = (await get_pods()) || [];
      pod_labels.clear();
      items.forEach((item) => {
        const { role, app } = item.metadata.labels;
        const ip = item.status?.podIP;
        pod_labels.set(item.metadata.name, { role, app, ip });
      });
      return pod_labels;
    },
    setToPrimary: async (pod_dns_name) =>
      await set_pod_role(pod_dns_name, "primary"),
    setToReplica: async (pod_dns_name) =>
      await set_pod_role(pod_dns_name, "replica"),
  };
})();
export default PodManager;
