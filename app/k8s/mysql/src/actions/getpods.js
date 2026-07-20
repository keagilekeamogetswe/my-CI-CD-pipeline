import { k8s_api, namespace } from "../k8.object.interface.js";

async function get_pods() {
  console.log({ namespace });
  const response = await k8s_api.listNamespacedPod({ namespace });
  // Only retrive those created by a mysql statefulset
  return response.items.filter((pod) =>
    pod.metadata?.ownerReferences?.some(
      (owner) => owner.kind === "StatefulSet" && owner.name === "mysql",
    ),
  );
}

export default get_pods;
