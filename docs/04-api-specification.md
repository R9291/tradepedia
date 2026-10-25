# TRADEPEDIA — API Specification

All API endpoints return JSON in the standard format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
Error format:
```json
{
  "success": false,
  "error": "Error message description",
  "details": [ ... ]
}
```

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user profile and an initial KES trading account.
- **Request Body**:
  ```json
  {
    "email": "trader@example.com",
    "phone": "+254712345678",
    "password": "SecurePassword123!",
    "fullName": "Jane Doe"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "cuid_123",
        "email": "trader@example.com",
        "fullName": "Jane Doe",
        "role": "USER",
        "kycStatus": "NOT_SUBMITTED"
      }
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user credentials and issues an HTTP-only session cookie.
- **Request Body**:
  ```json
  {
    "email": "trader@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Sets `tradepedia_session` cookie.

### `POST /api/auth/logout`
Terminates the session and clears the cookie.

### `POST /api/auth/verify-email`
Verifies user email address via token.

### `POST /api/auth/reset-password`
Initiates or executes password recovery.

---

## 2. Profile & KYC Endpoints

### `GET /api/me`
Fetches authenticated user profile, active account balances, and KYC status.

### `PUT /api/me`
Updates user contact preferences.

### `POST /api/kyc/documents`
Submits identity documents and user KYC profile.
- **Request Body** (Multipart / JSON):
  ```json
  {
    "documentType": "NATIONAL_ID",
    "idNumber": "12345678",
    "nationality": "Kenyan",
    "dateOfBirth": "1995-05-12",
    "address": "Kilimani, Nairobi, Kenya",
    "documentUrl": "/uploads/kyc/national_id_front.jpg",
    "selfieUrl": "/uploads/kyc/selfie.jpg"
  }
  ```
- **Response `200 OK`**: Updates user `kycStatus` to `PENDING`.

### `GET /api/kyc/status`
Returns user KYC submission history and current status.

---

## 3. Deposit Endpoints (Phase 2 Ready)

### `POST /api/deposits/initiate`
Initiates Safaricom Daraja STK Push prompt to user's phone.
- **Prerequisite**: KYC status must be `APPROVED`.
- **Request Body**:
  ```json
  {
    "amount": 1000,
    "phoneNumber": "254712345678"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "depositId": "dep_123",
    "checkoutRequestId": "ws_CO_123",
    "status": "INITIATED"
  }
  ```

### `POST /api/deposits/mpesa/callback`
Direct webhook called by Safaricom Daraja on STK Push completion. Validates and idempotently credits user account with a `DEPOSIT` ledger entry.

### `GET /api/deposits`
Lists user deposit history and receipt records.

---

## 4. Market Data & Trading (Phase 3 Ready)

### `GET /api/instruments`
Returns list of available Forex currency pairs with contract size, leverage, and active state.

### `GET /api/trades/open`
Returns all active open positions for the user.

### `GET /api/trades/history`
Returns closed trade records and realized profit/loss.

### `POST /api/trades`
Opens a new trade position (BUY / SELL).
- **Request Body**:
  ```json
  {
    "symbol": "EURUSD",
    "direction": "BUY",
    "lotSize": 0.01,
    "stopLoss": 1.0800,
    "takeProfit": 1.0900
  }
  ```

### `POST /api/trades/:id/close`
Closes an open position at current market price.

### `GET /api/account/summary`
Calculates equity, locked margin, free margin, margin level, and floating PnL.

---

## 5. Administrative Endpoints (Admin / Compliance Only)

### `GET /api/admin/users`
Lists all registered users with filters for KYC status and role.

### `POST /api/admin/kyc`
Reviews pending KYC submission.
- **Request Body**:
  ```json
  {
    "userId": "cuid_123",
    "decision": "APPROVED", // or "REJECTED"
    "reviewerNote": "All identity records verified against national database."
  }
  ```

### `POST /api/admin/adjustments`
Executes an audit-logged administrative manual balance adjustment.
- **Request Body**:
  ```json
  {
    "userId": "cuid_123",
    "amount": 500.00,
    "reason": "Reconciliation correction for disputed M-Pesa reference."
  }
  ```
- Creates an `ADJUSTMENT` ledger entry and `AuditLog` entry.
