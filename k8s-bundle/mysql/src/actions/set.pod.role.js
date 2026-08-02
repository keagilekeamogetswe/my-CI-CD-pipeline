import { k8s_api, namespace } from "../k8.object.interface.js";

async function set_pod_role(pod_dns_name, role_value) {
  await k8s_api.patchNamespacedPod({
    name: pod_dns_name,
    namespace: namespace,
    // The SDK defaults to a JSON Patch array structure:
    body: [
      {
        op: "add", // Works for both adding new labels and updating existing ones
        path: "/metadata/labels/role",
        value: role_value,
      },
    ],
  });
}

export default set_pod_role;
