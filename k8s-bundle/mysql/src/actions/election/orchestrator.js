import PodManager from "../../pod.manager";
import { ElectionConstantsRepository } from "./constants";
import { PodElection } from "./election.ops";
import { ElectionSQLOps } from "./replication.candidate.ops";

export const ElectionOrchestrator =(()=>{
  let initialized = false
  let running_set = new Map()
  let primary_pod = null;
  let primary_is_queued;
  let push_queue_assignment_callback = new Map()
  // Get the current list of pods
  async function list_running_pods(inverted=false){
    // Reset primary pod
    primary_pod = null
    // Get all pods
    const all_pod = await PodManager.getPods()
    const unassigned_set = []
    all_pod.forEach(pod=> {
      // Break down the logic into two separate flags for clarity
      const [ready, has_role] = [
        // A pod is considered "ready" if:
        // - Its status is RUNNING
        // - It has passed readiness checks
        pod.status === ElectionConstantsRepository.status.RUNNING && pod.ready,

        // A pod "has a role" if the role field is truthy (PRIMARY/REPLICA).
        // If role is undefined/null, then it does not have a role.
        pod.role
      ];

      // Pod is running, ready, and has a role assigned
      const running_with_assigned_role = ready && has_role;

      // Pod is running, ready, but has no role assigned
      const running_with_no_role = ready && !has_role;

      if(running_with_assigned_role){
        // Assign primary if in the future this pod will take replica role then it will need know the name of primary
        if(pod.role == ElectionConstantsRepository.roles.PRIMARY)
          primary_pod = pod.name
        running_set.set(pod.name, pod)
      }
      //Clean up running pods list
      else running_set.delete(pod.name)
      const run_scan = running_with_no_role && inverted
      if(run_scan) unassigned_set.push(pod)
    })

    const running_pod_names = []

    running_set.forEach(pod=>running_pod_names.push(pod.name))
    return (inverted) ? unassigned_set: running_pod_names;
  }
  // Checks the best available with the current running
  function checkAvailableRole(){
    const roles = new Set()
    running_set.forEach(pod=>roles.add(pod.role))

    if(roles.has(ElectionConstantsRepository.roles.PRIMARY))
      return ElectionConstantsRepository.roles.REPLICA
    else if(roles.has(ElectionConstantsRepository.roles.REPLICA))
      return ElectionConstantsRepository.roles.PROMOTE;
    else return ElectionConstantsRepository.roles.PRIMARY
  }
  // give the right callback for role
  function getRoleCallback(role){
    if(role==ElectionConstantsRepository.roles.PRIMARY)
      return async (pod_name)=> {
        try{
          console.log("[Role Assignment] Primary locked");
          primary_is_queued = true
          await PodElection.start_primary(pod_name)
        }catch(error){
          console.error("Ran into a problem assigning primary on: ", pod_name)
          console.error(error)
        }
        primary_is_queued = false
        console.log("[Role Assignment] Primary released");

  }
    else if(role== ElectionConstantsRepository.roles.REPLICA)
      // Intercepting the original methods so that the callback can be consistent with othersS
      return async(pod_name)=>{
        console.log("Primary prepared for replica: ", primary_pod)
        await PodElection.start_replica(pod_name, primary_pod)
      }
      // If replicas are found
      else if(role==ElectionConstantsRepository.roles.PROMOTE){
        return async (pod_name)=>{
          console.log("[Role CallBack] Promoting and then replicating!")
          console.log("[Role CallBack] Now promoting...")
          await ElectionOrchestrator.promote()
          console.log("[Role CallBack] Promotion done...")
          console.log("[Role CallBack] Starting replication for: ", pod_name)
          await PodElection.start_replica(pod_name, primary_pod)
          console.log("[Role CallBack] Replication operation completed: ", pod_name)

        }
      }
    else throw new Error("Role not supported!S");
  }
  // If the operator crashed the initial will reset to false in which case it needs to scan and push available pods
  async function scan(){
    console.log("[SCAN] Starting scan for idle pods...");
    if (initialized) return;
    const invert_election = true
    const unassigned_set = await list_running_pods(invert_election)
    console.log(`[SCAN] Found ${unassigned_set.length} unassigned pods`);

    for (let index = 0; index < unassigned_set.length; index++) {
      const pod = unassigned_set[index];
      await ElectionOrchestrator.push(pod)
    }

    initialized = true
    console.log("[SCAN] Scan complete, orchestrator initialized");
  }
  (async () => {
    console.log("SCAN OPERATION: scanning for idle pods..");
    await scan();
    console.log("SCAN OPERATION: Scan complete");
  })();
  return{
    push: async(pod)=>{
      console.log(`[PUSH] Attempting to assign role for pod: ${pod.name}`);
      // Must assign pod with a new role
      const running_pod_names = await list_running_pods()
      // Run queued pushes
      for (const [key, callback] of push_queue_assignment_callback) {
        try{
          await callback()
        }catch(error){
          console.error("-QUEUED POD NAME: ", key, " ran into error")
          console.error(error)
        }
      }

      const pushed_confirmed_to_be_running = running_pod_names.includes(pod.name);
      if (pushed_confirmed_to_be_running) {
        console.log(`[PUSH] Pod ${pod.name} already running with role, skipping`);
        return false;
      }
      // Ignore push if pod being pushing is having a role
      const run_assignment = async()=>{// Role assignment

        const role = checkAvailableRole() // get available role
        console.log(`[PUSH] Assigning role ${role} to pod: ${pod.name}`);
        const roleAssignmentCallback = getRoleCallback(role)
        await roleAssignmentCallback(pod.name)
      }

      if(primary_is_queued){
          console.log("[Role Assignment] Primary locked deferring role assignment");
        push_queue_assignment_callback.set(pod.name, run_assignment)
        console.log("[Role Assignment] role assignment deferred");
      }else{
        await run_assignment()
      }
      return true;
    },
    promote: async()=>{
      // Called only when primary fails
      console.log("[PROMOTE] Promotion triggered due to primary failure");
      // Prevent overlapping promotions
      if (primary_is_queued) {
        console.log("[PROMOTE] Promotion already in progress, skipping");
        return;
      }
      console.log("[PROMOTE] Primary locked");

      primary_is_queued = true;
      try {
        const running_pod_names = (await list_running_pods())
        const candidate = await ElectionSQLOps.getBestCandidate(running_pod_names);
        console.log(`[PROMOTE] Candidate selected: ${candidate.name} (GTID=${candidate.gtid}, lag=${candidate.lag})`);
        console.log("Promoting candidate:", candidate.name);
        await PodElection.start_primary(candidate.name);
        console.log(`[PROMOTE] ${candidate.name} promoted to PRIMARY`);
        for (const pod_name of running_pod_names) {
          if (candidate.name === pod_name) continue;
          console.log(`[PROMOTE] Assigning REPLICA role to pod: ${pod_name}`);
          await PodElection.start_replica(pod_name, candidate.name);
        }
        console.log("[PROMOTE] Promotion complete");
      } catch (error) {
        console.error(`[ERROR] Failed to assign role to pod:`, error);
      } finally {
        primary_is_queued = false;
      console.log("[PROMOTE] Primary lock released");
      }
      }

  }

})()