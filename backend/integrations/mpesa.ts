export type MpesaCallbackPayload = {
  checkoutRequestId: string;
  merchantRequestId: string;
  invoiceId: string;
  phoneNumber: string;
  amount: number;
  mpesaReceiptNumber?: string;
  resultCode: number;
};

export type DarajaRequest = {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDescription: string;
};

export type DarajaConfig = {
  configured: boolean;
  environment: "sandbox" | "production";
};

export const ensureMpesaConfigured = (config: DarajaConfig) => {
  if (!config.configured) {
    throw new Error("M-Pesa credentials are not configured for live provider calls");
  }
};

export const normalizeKenyanPhone = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `+254${digits}`;
  throw new Error("Phone number must be a valid Kenyan +254 number");
};
