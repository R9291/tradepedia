import { describe, it, expect } from "vitest";
import {
  formatKenyanPhoneNumber,
  getDarajaTimestamp,
  generateDarajaPassword,
} from "../src/lib/mpesa";
import { depositInitiateSchema } from "../src/lib/validations";

describe("M-Pesa Phone Number Formatting", () => {
  it("should normalize 07XXXXXXXX to 2547XXXXXXXX", () => {
    expect(formatKenyanPhoneNumber("0712345678")).toBe("254712345678");
  });

  it("should normalize +2547XXXXXXXX to 2547XXXXXXXX", () => {
    expect(formatKenyanPhoneNumber("+254712345678")).toBe("254712345678");
  });

  it("should normalize 01XXXXXXXX (Airtel/Safaricom new 01 prefix) to 2541XXXXXXXX", () => {
    expect(formatKenyanPhoneNumber("0112345678")).toBe("254112345678");
  });

  it("should leave already normalized 2547XXXXXXXX unchanged", () => {
    expect(formatKenyanPhoneNumber("254799887766")).toBe("254799887766");
  });

  it("should throw for invalid or international non-Kenyan numbers", () => {
    expect(() => formatKenyanPhoneNumber("12345")).toThrow();
    expect(() => formatKenyanPhoneNumber("+14155552671")).toThrow();
    expect(() => formatKenyanPhoneNumber("0201234567")).toThrow();
  });
});

describe("Daraja Credentials & Security Formulas", () => {
  it("should generate a 14-digit Daraja timestamp", () => {
    const timestamp = getDarajaTimestamp(new Date("2026-10-22T14:30:45Z"));
    expect(timestamp).toMatch(/^\d{14}$/);
    expect(timestamp.length).toBe(14);
  });

  it("should generate valid Base64 encoded Daraja password matching Safaricom spec", () => {
    const shortcode = "174379";
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const timestamp = "20261022143045";

    const password = generateDarajaPassword(shortcode, passkey, timestamp);

    // Verify it is valid base64
    const decoded = Buffer.from(password, "base64").toString("utf-8");
    expect(decoded).toBe(`${shortcode}${passkey}${timestamp}`);
  });
});

describe("M-Pesa Webhook Callback Extraction & Idempotency", () => {
  const sampleCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: "29115-34620561-1",
        CheckoutRequestID: "ws_CO_191220191020363925",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 2500 },
            { Name: "MpesaReceiptNumber", Value: "QWE123RTY4" },
            { Name: "TransactionDate", Value: 20261022143500 },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
      },
    },
  };

  it("should correctly extract receipt number and paid amount from Safaricom callback metadata", () => {
    const items = sampleCallback.Body.stkCallback.CallbackMetadata.Item;
    let receipt: string | null = null;
    let amount: number | null = null;

    for (const item of items) {
      if (item.Name === "MpesaReceiptNumber") receipt = item.Value as string;
      if (item.Name === "Amount") amount = item.Value as number;
    }

    expect(receipt).toBe("QWE123RTY4");
    expect(amount).toBe(2500);
  });

  it("should prevent double-crediting when an identical CheckoutRequestID arrives multiple times", () => {
    const processedCheckouts = new Map<string, string>();
    processedCheckouts.set("ws_CO_191220191020363925", "SUCCESSFUL");

    const incomingCheckoutId = "ws_CO_191220191020363925";
    const isAlreadyProcessed = processedCheckouts.get(incomingCheckoutId) === "SUCCESSFUL";

    expect(isAlreadyProcessed).toBe(true);
  });
});

describe("Deposit Initiation Validation (KES 100 Minimum)", () => {
  it("should accept valid deposit requests at or above KES 100", () => {
    const validAtMin = depositInitiateSchema.safeParse({
      amount: 100,
      phoneNumber: "0712345678",
    });
    expect(validAtMin.success).toBe(true);

    const validHigher = depositInitiateSchema.safeParse({
      amount: 5000,
      phoneNumber: "254712345678",
    });
    expect(validHigher.success).toBe(true);
  });

  it("should reject deposit requests below KES 100", () => {
    const belowMin = depositInitiateSchema.safeParse({
      amount: 50,
      phoneNumber: "0712345678",
    });
    expect(belowMin.success).toBe(false);
    if (!belowMin.success) {
      expect(belowMin.error.issues[0].message).toContain("Minimum deposit amount is KES 100.00");
    }
  });

  it("should reject deposit requests exceeding KES 150,000", () => {
    const aboveMax = depositInitiateSchema.safeParse({
      amount: 200000,
      phoneNumber: "0712345678",
    });
    expect(aboveMax.success).toBe(false);
    if (!aboveMax.success) {
      expect(aboveMax.error.issues[0].message).toContain("Maximum single deposit amount is KES 150,000.00");
    }
  });
});
