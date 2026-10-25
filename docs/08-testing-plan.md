# TRADEPEDIA — Quality Assurance & Testing Plan

## 1. Scope of Testing
Verification ensures financial correctness, regulatory safety gates, and state synchronization across all layers.

## 2. Test Suites

### Unit Tests
1. **Financial Ledger Calculations**:
   - Verify balance after deposit: $\text{Balance}_{new} = \text{Balance}_{old} + \text{Deposit Amount}$.
   - Verify that all balance-changing events insert a valid `LedgerEntry`.
   - Prevent balances from going negative on invalid deductions.
2. **Trading Math**:
   - BUY PnL: $(exit - entry) \times contractSize \times lotSize$.
   - SELL PnL: $(entry - exit) \times contractSize \times lotSize$.
   - Margin requirement calculation at specified leverage.
3. **M-Pesa Webhook Idempotency**:
   - Verify repeated delivery of identical `checkoutRequestId` does not duplicate ledger credits.
   - Verify failed or cancelled `ResultCode` results in `FAILED` deposit status without crediting funds.

### Integration Tests
1. **KYC Gate Verification**:
   - User in `NOT_SUBMITTED` or `PENDING` status cannot initiate deposits or execute trades.
   - User in `APPROVED` status can initiate deposits and execute trades.
2. **Authentication & Role Authorization**:
   - Non-admin user cannot access `/api/admin/*` routes or admin UI views.
   - Admin cannot approve their own KYC submission.
3. **Admin Adjustment Audit Trail**:
   - Admin balance adjustment requires non-empty reason and inserts both an `ADJUSTMENT` ledger entry and an `AuditLog` entry.

## 3. Test Command
```bash
npm run test
```
Runs vitest against all unit and integration suites under `tests/`.
