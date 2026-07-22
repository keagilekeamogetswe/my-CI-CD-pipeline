import * as k8s from "@kubernetes/client-node";
import { k8s_cluster_config } from "./cluster.config";

const kc = new k8s.KubeConfig();
// Check if you are in the test environment (using string quotes)
console.log({ here: process.env.ENV });
if (process.env.ENV == "test") kc.loadFromOptions(k8s_cluster_config);
else kc.loadFromDefault();
console.log("current cluster: ", kc.getCurrentCluster());
console.log("Current user:", kc.getCurrentUser());
console.log("Current context:", kc.getCurrentContext());
console.log(kc.exportConfig());
const k8s_api = kc.makeApiClient(k8s.CoreV1Api);
const k8s_watch = new k8s.Watch(kc);
const namespace = process.env.K8S_NAMESPACE;
console.log("namespace: ", namespace);
export { k8s_api, k8s_watch, namespace };
