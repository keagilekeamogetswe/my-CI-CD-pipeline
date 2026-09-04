import type { VerificationPayload } from "@/app/models/profile.request.payload";
export const VerificationPayloadStore = (() => {
  let payload: VerificationPayload | null = null;
  return {
    getPayload() {
      return payload;
    },
    setPayload(newPayload: VerificationPayload) {
      payload = newPayload;
    },
    clear() {
      payload = null;
    },
  };
})();
