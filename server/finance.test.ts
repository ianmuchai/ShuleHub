import { beforeEach, describe, expect, test } from "vitest";
import { createInvoice, getStatement, handleMpesaCallback } from "./financeService";
import { createSession } from "./security";
import { resetStore } from "./store";

describe("finance", () => {
  beforeEach(() => resetStore());

  test("payment callback is idempotent and creates one receipt", async () => {
    const finance = await createSession("finance@demo.school", "FinancePass123!");
    const invoice = createInvoice(finance.sessionId, {
      learnerId: "learner-001",
      lines: [{ description: "Term 1 Tuition", amount: 50000 }],
      dueDate: "2026-09-01",
    });

    const payload = {
      checkoutRequestId: "ws_CO_190820261234",
      merchantRequestId: "merchant-001",
      invoiceId: invoice.id,
      phoneNumber: "+254712345678",
      amount: 50000,
      mpesaReceiptNumber: "RKT123ABC",
      resultCode: 0,
    };

    handleMpesaCallback(payload);
    handleMpesaCallback(payload);

    expect(getStatement(finance.sessionId, "learner-001").balance).toBe(0);
    expect(getStatement(finance.sessionId, "learner-001").receipts).toHaveLength(1);
  });

  test("unmatched callbacks create reconciliation exceptions", () => {
    const transaction = handleMpesaCallback({
      checkoutRequestId: "missing",
      merchantRequestId: "merchant-missing",
      invoiceId: "missing-invoice",
      phoneNumber: "+254712345678",
      amount: 2000,
      mpesaReceiptNumber: "RKT404",
      resultCode: 0,
    });

    expect(transaction.status).toBe("exception");
  });
});
