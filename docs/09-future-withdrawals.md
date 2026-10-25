# TRADEPEDIA — Future Withdrawals Architecture (Phase 5)

> **Important**: Withdrawals are **explicitly excluded** from Version 1. No withdrawal UI, withdrawal API endpoints, or Safaricom B2C payout automation is active in V1. This document details the architectural preparation and future implementation path.

---

## 1. Schema Preparation (Already included in V1)
In the Prisma schema, the enum `LedgerEntryType` reserves the `WITHDRAWAL` value:
```prisma
enum LedgerEntryType {
  DEPOSIT
  TRADE_OPEN_MARGIN_HOLD
  TRADE_CLOSE_MARGIN_RELEASE
  TRADE_PROFIT
  TRADE_LOSS
  FEE
  ADJUSTMENT
  WITHDRAWAL // Reserved for Phase 5
}
```

## 2. Future Database Schema (Phase 5 Additions)
When Phase 5 is triggered, the following table will be migrated without breaking any existing relations:

```prisma
enum WithdrawalStatus {
  REQUESTED
  AML_REVIEW
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  FAILED
}

model WithdrawalRequest {
  id                 String           @id @default(cuid())
  userId             String
  user               User             @relation(fields: [userId], references: [id])
  accountId          String
  account            Account          @relation(fields: [accountId], references: [id])
  amount             Decimal          @db.Decimal(18, 2)
  fee                Decimal          @default(0) @db.Decimal(18, 2)
  netAmount          Decimal          @db.Decimal(18, 2)
  phoneNumber        String           // Destination M-Pesa phone number
  status             WithdrawalStatus @default(REQUESTED)
  b2cConversationId  String?
  b2cOriginatorId    String?
  rejectionReason    String?
  approvedBy         String?
  approvedAt         DateTime?
  completedAt        DateTime?
  createdAt          DateTime         @default(now())
}
```

## 3. Future M-Pesa B2C Payout Workflow
1. **User Request**:
   - User navigates to `/withdraw`.
   - Enters withdrawal amount (min KES 500, max daily KES 150,000).
   - Available balance is locked immediately to prevent double spending.
2. **AML & Compliance Review**:
   - Automated AML rules check: Was deposit held for minimum period? Are there open trades near margin call?
   - If over threshold (e.g. > KES 50,000), manual Compliance Officer approval is required.
3. **Execution via Safaricom B2C API**:
   - Daraja B2C endpoint: `POST /mpesa/b2c/v1/paymentrequest`.
   - Command ID: `BusinessPayment` or `SalaryPayment`.
   - Initiator Name, Security Credential (encrypted with Safaricom Public Key certificate).
4. **Callback & Final Ledger Entry**:
   - Safaricom calls QueueTimeoutURL or ResultURL.
   - On success:
     - Deduct balance permanently.
     - Release temporary hold.
     - Insert `LedgerEntry(type: WITHDRAWAL, amount: -netAmount)`.
     - Insert `LedgerEntry(type: FEE, amount: -fee)` if applicable.
   - On failure:
     - Release hold back to available balance.
     - Set withdrawal status to `FAILED`.
