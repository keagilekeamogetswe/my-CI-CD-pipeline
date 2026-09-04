export interface VerificationPayload {
  name: string;
  dob: string;
  lastname: string;
  phone: {
    code: string;
    body: string;
    dial_code_id: number;
  };
}
