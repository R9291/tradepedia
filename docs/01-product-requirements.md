# TRADEPEDIA — Product Requirements Document (PRD)

## 1. Executive Summary & Product Vision
TRADEPEDIA is an online forex trading platform tailored for East African markets, with native Kenya Shillings (KES) support and Safaricom Daraja M-Pesa STK Push deposits. 

The platform enables users to register, undergo comprehensive Know-Your-Customer (KYC) verification, deposit trading capital seamlessly via M-Pesa, view real-time foreign exchange currency quotes, and execute spot forex trades with defined risk controls (stop-loss, take-profit, leverage, margin requirements).

## 2. Regulatory Compliance & Disclaimer
- **Jurisdiction**: Republic of Kenya.
- **Regulatory Framework**: Capital Markets Authority (CMA) under the *Capital Markets (Online Foreign Exchange Trading) Regulations, 2017*.
- **Operating Modes**:
  - `DEMO_MODE=true` (Default): All users trade using simulated paper funds. Real M-Pesa money transfers are simulated or disabled. UI displays: `“Demo mode. No real-money trading.”`
  - `DEMO_MODE=false`: Real M-Pesa deposits enabled only when platform is legally licensed, bank accounts are segregated, and compliance oversight is operational.
- **Mandatory Risk Warning**:
  > *"Trading involves substantial risk of loss. Do not deposit money you cannot afford to lose."*
- **No Profit Guarantees**: Absolute prohibition on advertising or promising fixed, guaranteed, or risk-free returns.

## 3. Version 1 Scope

### 3.1 Included in V1
1. **User Lifecycle & Authentication**:
   - Registration with Email, Phone (+254 format), and Password.
   - Secure session handling via HTTP-only SameSite cookies and JWTs.
   - Email & Phone verification flags.
   - Role-Based Access Control: `USER`, `ADMIN`, `COMPLIANCE`.
2. **KYC Verification System**:
   - Mandatory before any deposit or trading activity.
   - Collection of Full Name, DOB, Nationality, Physical Address, ID Type (National ID, Passport, Alien Card), ID Number, Document upload, and Selfie.
   - Admin review workflow: Pending -> Approved or Rejected (with mandatory reviewer reason).
3. **M-Pesa STK Push Deposits**:
   - Safaricom Daraja M-Pesa Express API.
   - Pre-validation of KYC approval, minimum/maximum deposit amounts, and Kenyan phone format.
   - Two-phase deposit creation: record initialized -> STK Push triggered -> asynchronous Safaricom callback webhook reconciliation.
   - Cryptographic validation & idempotent crediting.
4. **Internal Trading Engine & Market Data**:
   - Real-time bid/ask pricing via WebSocket stream.
   - Market execution: Buy opens at Ask, closes at Bid; Sell opens at Bid, closes at Ask.
   - Configurable spreads, lot sizes (0.01 micro lot upwards), leverage, and contract sizes.
   - Risk management: Stop-loss, Take-profit, daily loss limits, margin call warning at 80%, automated liquidation at 100% margin utilization.
5. **Double-Entry Style Financial Ledger**:
   - Absolute source of truth for all balances.
   - Every balance mutation generates an immutable `LedgerEntry`.
   - Post-mutation balance recorded for verification.
6. **Administrative & Risk Backoffice**:
   - User directory with status toggles.
   - KYC approval/rejection panel with document viewing.
   - Deposit audit & manual reconciliation tools.
   - Trade monitoring across all active currency pairs.
   - Manual balance adjustments (audit logged, requiring mandatory administrative reason, writing `ADJUSTMENT` ledger entry).

### 3.2 Explicitly Excluded from V1
- **User Withdrawals**: Out of scope for V1. The UI explicitly states:
  > *"Withdrawals are not available yet. This feature will be introduced in a future update."*
- Bank card, PayPal, or Cryptocurrency deposits.
- Safaricom M-Pesa B2C automated payouts.
- Copy trading, PAMM accounts, or social trading.
- Referral/affiliate commissions.
- Automated trading bots / Expert Advisors (EAs).
