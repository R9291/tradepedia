# TRADEPEDIA — Security & Compliance Architecture

## 1. Compliance Framework (Kenya CMA & AML/CFT)
Under the **Capital Markets (Online Foreign Exchange Trading) Regulations, 2017** and POCAMLA (Proceeds of Crime and Anti-Money Laundering Act):
1. **Mandatory KYC Gating**: No deposit initiation or order execution is permitted until the user's KYC package is reviewed and marked `APPROVED` by a Compliance Officer or Administrator.
2. **Segregated Accounts**: Trading client money must not be commingled with corporate operational funds.
3. **No Profit Guarantees**: Marketing materials, interfaces, and communications must never promise guaranteed profits.
4. **Mandatory Disclosures**: Persistent disclaimer on all landing, deposit, and trading views:
   > *"Trading involves substantial risk of loss. Do not deposit money you cannot afford to lose."*

## 2. Authentication & Session Security
- **Password Hashing**: `bcryptjs` with salt rounds = 10. Passwords must contain minimum 8 characters, uppercase, lowercase, numbers, and symbols.
- **Session Tokens**: JWT / Jose issued inside `httpOnly`, `secure`, `sameSite: "lax"`, and path-restricted cookies.
- **Role Isolation**: Strict middleware verification for roles (`USER`, `ADMIN`, `COMPLIANCE`). Admin endpoints are physically isolated under `/api/admin/*` and require explicit role check.

## 3. Financial Ledger Invariants
1. **Double-Entry Style Integrity**: Direct modification of `Account.availableBalance` without a corresponding `LedgerEntry` is strictly prevented at the code level.
2. **Transaction Atomicity**: All operations modifying funds (Deposits, Trades, Admin Adjustments) run inside `prisma.$transaction`.
3. **Immutable Ledger**: Ledger rows cannot be updated or deleted. Corrections require an offsetting `ADJUSTMENT` ledger entry with mandatory reason and `AuditLog` link.

## 4. Sensitive Data Storage & Rate Limiting
- **KYC Storage**: Identity cards and selfies are stored in private object storage (local private path or S3/Supabase private bucket) accessible only through authenticated, time-limited signed URLs or admin proxy routes.
- **Rate Limiting**: Rate limits applied to `/api/auth/*` (5 req/min), `/api/deposits/initiate` (3 req/min), and `/api/trades` (30 req/min).
