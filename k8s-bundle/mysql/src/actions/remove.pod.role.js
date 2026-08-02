import { k8s_api, namespace } from "../k8.object.interface.js";

/**
 * Removes a label from a Kubernetes pod.
 *
 * @param {Object} pod - Pod object.
 * @param {string} label - Label key to remove.
 */
async function removePodLabel(pod, label = "role") {
  const { name, labels = {} } = pod;

  if (!(label in labels)) {
    console.log(`No ${label} label on ${name}`);
    return;
  }

  try {
    await k8s_api.patchNamespacedPod({
      name,
      namespace,
      body: {
        metadata: {
          labels: {
            [label]: null,
          },
        },
      },
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    });

    console.log(`Removed ${label} from ${name}`);
  } catch (error) {
    if (error.code === 404) {
      console.log(`Pod ${name} disappeared`);
      return;
    }

    console.error(`Failed removing ${label} from ${name}:`, error.body || error);
    throw error;
  }
}

export default removePodLabel;