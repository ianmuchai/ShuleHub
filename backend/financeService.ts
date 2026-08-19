import { randomUUID } from "node:crypto";
import { appendAudit } from "./audit";
import { AppError } from "./errors";
import { MpesaCallbackPayload, normalizeKenyanPhone } from "./integrations/mpesa";
import { requirePermission, requireSession } from "./security";
import { store } from "./store";
import { Invoice, PaymentTransaction, Receipt } from "./types";

export type CreateInvoiceInput = {
  learnerId: string;
  lines: Array<{ description: string; amount: number }>;
  dueDate: string;
};

export type InitiatePaymentInput = {
  invoiceId: string;
  phoneNumber: string;
  amount: number;
};

export type LearnerStatement = {
  learnerId: string;
  invoices: Invoice[];
  receipts: Receipt[];
  balance: number;
};

const nextReceiptNumber = () => `RCT-${String(store.receipts.length + 1).padStart(6, "0")}`;

export const assertCanViewLearnerFinance = (sessionId: string, learnerId: string) => {
  const context = requireSession(sessionId);
  if (context.permissions.has("finance:manage")) {
    return context;
  }

  if (context.permissions.has("learner:linked:read") && context.user.guardianProfileId) {
    const linked = store.guardianLearners.some(
      (link) => link.guardianProfileId === context.user.guardianProfileId && link.learnerId === learnerId,
    );
    if (linked) {
      return context;
    }
  }

  throw new AppError("Forbidden", 403, "FORBIDDEN");
};

export const createInvoice = (sessionId: string, input: CreateInvoiceInput): Invoice => {
  const context = requirePermission(sessionId, "finance:manage");
  const learner = store.learners.find((candidate) => candidate.id === input.learnerId);
  if (!learner) {
    throw new AppError("Learner was not found", 404, "LEARNER_NOT_FOUND");
  }

  const lines = input.lines.map((line) => ({ id: randomUUID(), ...line }));
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  if (total <= 0) {
    throw new AppError("Invoice total must be greater than zero", 400, "INVALID_INVOICE_TOTAL");
  }

  const invoice: Invoice = {
    id: randomUUID(),
    learnerId: input.learnerId,
    reference: `INV-${String(store.invoices.length + 1).padStart(6, "0")}`,
    dueDate: input.dueDate,
    lines,
    total,
    balance: total,
    status: "open",
  };
  store.invoices.push(invoice);
  appendAudit({
    actorUserId: context.user.id,
    action: "finance.invoice.create",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: `Created invoice ${invoice.reference}`,
  });
  return invoice;
};

export const initiateMpesaPayment = (sessionId: string, input: InitiatePaymentInput): PaymentTransaction => {
  const invoice = store.invoices.find((candidate) => candidate.id === input.invoiceId);
  if (!invoice) {
    throw new AppError("Invoice was not found", 404, "INVOICE_NOT_FOUND");
  }
  assertCanViewLearnerFinance(sessionId, invoice.learnerId);

  const transaction: PaymentTransaction = {
    id: randomUUID(),
    invoiceId: invoice.id,
    checkoutRequestId: `pending-${randomUUID()}`,
    merchantRequestId: `merchant-${randomUUID()}`,
    phoneNumber: normalizeKenyanPhone(input.phoneNumber),
    amount: input.amount,
    status: "pending",
  };
  store.paymentTransactions.push(transaction);
  return transaction;
};

export const handleMpesaCallback = (payload: MpesaCallbackPayload): PaymentTransaction => {
  const existingPaid = store.paymentTransactions.find(
    (transaction) => transaction.checkoutRequestId === payload.checkoutRequestId && transaction.status === "paid",
  );
  if (existingPaid) {
    return existingPaid;
  }

  const invoice = store.invoices.find((candidate) => candidate.id === payload.invoiceId);
  if (!invoice) {
    const exception: PaymentTransaction = {
      id: randomUUID(),
      invoiceId: payload.invoiceId,
      checkoutRequestId: payload.checkoutRequestId,
      merchantRequestId: payload.merchantRequestId,
      phoneNumber: normalizeKenyanPhone(payload.phoneNumber),
      amount: payload.amount,
      status: "exception",
      mpesaReceiptNumber: payload.mpesaReceiptNumber,
    };
    store.paymentTransactions.push(exception);
    store.paymentExceptions.push(exception);
    appendAudit({
      action: "finance.mpesa.exception",
      entityType: "PaymentTransaction",
      entityId: exception.id,
      summary: "Received unmatched M-Pesa callback",
    });
    return exception;
  }

  const transaction: PaymentTransaction = {
    id: randomUUID(),
    invoiceId: invoice.id,
    checkoutRequestId: payload.checkoutRequestId,
    merchantRequestId: payload.merchantRequestId,
    phoneNumber: normalizeKenyanPhone(payload.phoneNumber),
    amount: payload.amount,
    status: payload.resultCode === 0 ? "paid" : "failed",
    mpesaReceiptNumber: payload.mpesaReceiptNumber,
  };
  store.paymentTransactions.push(transaction);

  if (transaction.status === "paid") {
    invoice.balance = Math.max(0, invoice.balance - transaction.amount);
    invoice.status = invoice.balance === 0 ? "paid" : "open";
    store.receipts.push({
      id: randomUUID(),
      receiptNumber: nextReceiptNumber(),
      learnerId: invoice.learnerId,
      invoiceId: invoice.id,
      paymentTransactionId: transaction.id,
      amount: transaction.amount,
      issuedAt: new Date().toISOString(),
    });
  }

  appendAudit({
    action: "finance.mpesa.callback",
    entityType: "PaymentTransaction",
    entityId: transaction.id,
    summary: `Processed M-Pesa callback for invoice ${invoice.reference}`,
  });
  return transaction;
};

export const getStatement = (sessionId: string, learnerId: string): LearnerStatement => {
  assertCanViewLearnerFinance(sessionId, learnerId);
  const invoices = store.invoices.filter((invoice) => invoice.learnerId === learnerId);
  const receipts = store.receipts.filter((receipt) => receipt.learnerId === learnerId);
  return {
    learnerId,
    invoices,
    receipts,
    balance: invoices.reduce((sum, invoice) => sum + invoice.balance, 0),
  };
};
