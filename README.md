# TRADEPEDIA — Online Forex Trading Platform (Kenya)

TRADEPEDIA is a high-performance web application designed for online forex trading in Kenya. It features simulated demo paper trading, strict Know-Your-Customer (KYC) onboarding, Safaricom Daraja M-Pesa STK Push deposits, real-time forex rates, internal trade execution, risk controls, an immutable ledger, and a comprehensive administrative portal.

---

> [!WARNING]
> **RISK DISCLOSURE**: Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Do not deposit or trade money you cannot afford to lose.
> 
> **COMPLIANCE NOTICE**: Under the Capital Markets (Online Foreign Exchange Trading) Regulations, 2017, trading or operating a forex platform in Kenya is a regulated activity requiring a Capital Markets Authority (CMA) license. By default, TRADEPEDIA runs in **`DEMO_MODE=true`** for simulated paper trading only.

---

## 1. Core Architecture & Phase 1 Scope

This release delivers **Phase 1: Foundation**:
- **Authentication**: Email/phone registration, bcrypt hashing, JWT session cookies, RBAC (`USER`, `ADMIN`, `COMPLIANCE`).
- **KYC Onboarding & Verification**: Document submission (National ID, Passport, Alien Card, Address, Selfie) and Admin review workflow.
- **Account & Immutable Double-Entry Ledger**: Atomic transaction tracking where every balance mutation creates an immutable `LedgerEntry`. Direct edits to ledger entries are strictly prohibited.
- **Compliance Mode**: Default `DEMO_MODE=true` crediting simulated trading capital (KES 100,000 demo balance upon approval) with persistent warnings.
- **Admin Portal**: User directory, KYC document inspection/decisioning, manual balance adjustment with mandatory reason and audit log, and system overview.
- **V1 Restriction**: **Withdrawals are strictly excluded from V1**. The UI prominently states:
  > *"Withdrawals are not available yet. This feature will be introduced in a future update."*

---

## 2. Technology Stack

- **Frontend & Server**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide icons.
- **Database & ORM**: PostgreSQL with Prisma ORM (all currency and rate values stored as fixed-precision `Decimal`).
- **Session & Auth**: HTTP-only SameSite cookies with signed JWT tokens (`jose`), `bcryptjs`.
- **Validation**: Strict schema validation with Zod.
- **Payments Gateway**: Safaricom Daraja 2.0 M-Pesa Express (STK Push).
- **Test Framework**: Vitest.

---

## 3. Environment Variables

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Compliance & Trading Mode
# When DEMO_MODE=true: users trade with simulated demo balances.
DEMO_MODE=true

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tradepedia?schema=public"

# Auth Secrets (32+ chars)
JWT_SECRET="tradepedia_super_secret_jwt_key_at_least_32_characters_long_for_security_123456"

# Safaricom Daraja M-Pesa Configuration (Phase 2)
MPESA_ENV=sandbox # or production
MPESA_CONSUMER_KEY="your_mpesa_consumer_key"
MPESA_CONSUMER_SECRET="your_mpesa_consumer_secret"
MPESA_SHORTCODE="174379"
MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
MPESA_CALLBACK_URL="https://yourdomain.com/api/deposits/mpesa/callback"

# Storage Configuration (Private storage for KYC documents)
KYC_STORAGE_DRIVER="local"
KYC_UPLOAD_DIR="./uploads/kyc"
```

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 20 & 24)
- PostgreSQL database instance (local, Supabase, Neon, or Railway)

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Apply database migrations
npx prisma migrate dev --name init

# 4. Seed initial instruments & admin account
npx prisma db seed

# 5. Run tests
npm run test

# 6. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 5. Safaricom Daraja M-Pesa Setup

1. Register on [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
2. Create an App under "M-Pesa Express" (STK Push).
3. Copy your `Consumer Key` and `Consumer Secret` into `.env`.
4. For Sandbox testing:
   - Shortcode: `174379`
   - Passkey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
   - Test Phone Number: Any Safaricom number subscribed to sandbox simulator.
5. In production, configure an SSL/HTTPS public URL for `MPESA_CALLBACK_URL`.

---

## 6. Seed Data & Default Admin Credentials

When running seed:
- **Admin Email**: `admin@tradepedia.co.ke`
- **Admin Password**: `TradepediaAdmin2026!`
- **Role**: `ADMIN`
- **Default Instruments**: `EURUSD`, `GBPUSD`, `USDJPY`, `USDCHF`, `AUDUSD`, `USDCAD`.

---

## 7. Future Withdrawals (Phase 5)

Withdrawals are excluded from Version 1, but the database schema reserves:
- `LedgerEntryType.WITHDRAWAL`
- Architectural documentation in `docs/09-future-withdrawals.md`

In Phase 5, the withdrawal flow will introduce:
1. User requests withdrawal to their verified M-Pesa phone number.
2. Balance is immediately held in escrow.
3. Automated AML / Compliance risk check and optional Compliance Officer manual approval.
4. Execution via Safaricom Daraja B2C payout API (`BusinessPayment`).
5. On B2C callback confirmation, balance deduction is finalized with a `WITHDRAWAL` ledger entry.

---

## 8. Documentation Index

Detailed architectural and regulatory documentation is organized in `docs/`:
- [`01-product-requirements.md`](docs/01-product-requirements.md)
- [`02-architecture.md`](docs/02-architecture.md)
- [`03-database-schema.md`](docs/03-database-schema.md)
- [`04-api-specification.md`](docs/04-api-specification.md)
- [`05-mpesa-integration.md`](docs/05-mpesa-integration.md)
- [`06-trading-rules.md`](docs/06-trading-rules.md)
- [`07-security-and-compliance.md`](docs/07-security-and-compliance.md)
- [`08-testing-plan.md`](docs/08-testing-plan.md)
- [`09-future-withdrawals.md`](docs/09-future-withdrawals.md)
