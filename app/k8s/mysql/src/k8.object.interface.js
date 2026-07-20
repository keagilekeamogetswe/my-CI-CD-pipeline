import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8s_api = kc.makeApiClient(k8s.CoreV1Api);
const k8s_watch = new k8s.Watch(kc);
const namespace = process.env.K8S_NAMESPACE;
console.log("namespace: ", namespace);
export { k8s_api, k8s_watch, namespace };
