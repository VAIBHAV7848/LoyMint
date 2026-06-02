<!--
Generated for: LoyMint
Source inputs: uploaded complete technical specification DOCX + customer app screen board image
Format: Markdown, security constraints + SQL + TypeScript contracts
-->
# LOYMINT — SECURITY CONSTRAINTS

```yaml
security_level: Demo MVP with production-grade guardrails
core_principle: Never trust the frontend for identity, shop ownership, QR validity, payment success, points calculation, or transaction status.
protected_assets:
  - customer profile data
  - phone and email
  - points balance
  - points ledger
  - transaction records
  - shop ownership data
  - QR signing secret
  - Razorpay credentials
  - Razorpay webhook secret
  - Supabase service role key
```

---

## 1. Security Objectives

```yaml
security_objectives:
  SO1: Only authenticated users can access protected APIs.
  SO2: Customers can read/update only their own profile and activity.
  SO3: Shopkeepers can access only their own shop and shop transactions.
  SO4: QR codes must be signed, short-lived, and validated on the backend.
  SO5: Payment success must be accepted only from verified Razorpay webhook events.
  SO6: Points balance must never become negative.
  SO7: Duplicate webhook events must not duplicate rewards or transaction success.
  SO8: Secrets must never be exposed to the React frontend or committed to GitHub.
  SO9: Reward calculations must be replay-safe, idempotent, and server authoritative.
```

---

## 2. Authentication Constraints

```yaml
authentication:
  provider: Supabase Auth
  supported_methods:
    - email
    - phone
    - Google
  backend_requirement:
    - Every protected endpoint must require Authorization Bearer token.
    - Backend must verify token with Supabase.
    - Backend must load public.users profile and role.
    - Role checks must happen server-side.
    - Frontend route guards are UX only, not security.
  public_routes:
    - /auth routes handled by Supabase/client flow
    - /api/webhook/razorpay only after signature verification
```

### Required middleware behavior

```ts
type AuthenticatedRequestUser = {
  id: string;          // public.users.id
  authUserId: string;  // Supabase auth.uid()
  role: 'customer' | 'shopkeeper';
};

async function requireAuth(req, res, next) {
  // 1. Read Authorization: Bearer <token>
  // 2. Reject 401 if token is missing
  // 3. Verify token using Supabase Auth
  // 4. Load matching public.users row
  // 5. Attach req.user
  // 6. Continue
}

function requireRole(role) {
  return (req, res, next) => {
    // Reject 403 if req.user.role !== role
  };
}
```

---

## 3. Authorization Matrix

```yaml
authorization_matrix:
  customer:
    allowed:
      - read own profile
      - update own profile/preferences
      - read own transactions
      - read own points log
      - scan QR and initiate payment
      - save/unsave offers
      - favourite/unfavourite shops
      - view nearby shops and public offers
    denied:
      - generate merchant QR
      - update shop reward rules
      - read other customer transactions
      - mark payment success manually
      - edit points balance directly
  shopkeeper:
    allowed:
      - create/update own shop
      - generate QR for own shop
      - read transactions for own shop
      - create/update/delete own shop offers
      - receive realtime status for own shop transactions
    denied:
      - access other merchants' shops
      - alter customer points directly
      - mark payment success manually
      - read unrelated customer history
```

---

## 4. Supabase RLS Constraints

RLS must be enabled on every public table. The backend may use the service role key only on the server, but frontend reads must still be protected by RLS.

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
```

### 4.1 Users policies

```sql
CREATE POLICY "users_can_read_own_profile"
ON public.users
FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "users_can_update_own_profile"
ON public.users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);
```

### 4.2 Shops policies

```sql
CREATE POLICY "any_authenticated_user_can_read_active_shops"
ON public.shops
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "shopkeepers_can_update_own_shop"
ON public.shops
FOR UPDATE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'shopkeeper'
  )
)
WITH CHECK (
  owner_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND role = 'shopkeeper'
  )
);
```

### 4.3 Transactions policies

```sql
CREATE POLICY "customers_can_read_own_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "shopkeepers_can_read_own_shop_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
);
```

### 4.4 Points log policies

```sql
CREATE POLICY "users_can_read_own_points_log"
ON public.points_log
FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);
```

### 4.5 Offers policies

```sql
CREATE POLICY "authenticated_users_can_read_active_offers"
ON public.offers
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "shopkeepers_manage_own_offers"
ON public.offers
FOR ALL
TO authenticated
USING (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
)
WITH CHECK (
  shop_id IN (
    SELECT s.id
    FROM public.shops s
    JOIN public.users u ON u.id = s.owner_id
    WHERE u.auth_user_id = auth.uid() AND u.role = 'shopkeeper'
  )
);
```

---

## 5. QR Security Constraints

```yaml
qr_security:
  token_type: Signed JWT
  expiry_seconds: 120
  signing_secret: QR_SECRET
  frontend_must_not_know_secret: true
  allowed_claims:
    - orderId
    - shopId
    - amount
    - exp
    - iat
  forbidden_claims:
    - userPoints
    - rewardDiscount
    - paymentSuccess
    - pointsToRedeem
```

### QR validation rules

```yaml
qr_validation:
  - Verify JWT signature.
  - Verify exp claim.
  - Verify transaction exists.
  - Verify transaction.status is pending.
  - Verify transactions.expires_at > now().
  - Verify token amount and shopId match database record.
  - Reject if already success, partial_paid, reward_paid, failed, or expired.
```

### QR payload example

```json
{
  "orderId": "ORD_1780000000000_ab12cd",
  "shopId": "2b16f3a8-74a1-4cad-9ddc-c85a7a1bb111",
  "amount": 500,
  "iat": 1780000000,
  "exp": 1780000120
}
```

---

## 6. Payment Security Constraints

```yaml
payment_security:
  provider: Razorpay Test Mode for MVP
  critical_rule: Never trust frontend Razorpay success callback as final payment truth.
  source_of_truth: Verified Razorpay webhook + database transaction update.
  webhook_requirements:
    - Use raw request body for signature verification.
    - Verify with RAZORPAY_WEBHOOK_SECRET.
    - Reject mismatch with HTTP 400.
    - Store payment_id/order_id.
    - Handle duplicate webhook idempotently.
```

### Payment webhook processing rules

```yaml
webhook_processing:
  payment_captured:
    - Verify signature.
    - Find transaction by razorpay_order_id.
    - If already finalized, return idempotent success without mutating points.
    - Validate status pending.
    - Validate not expired or follow defined retry policy.
    - Update transaction status.
    - Deduct reward points if partial reward was reserved.
    - Add earned points based on upi_paid.
    - Insert points_log rows.
    - Commit database transaction.
  payment_failed:
    - Verify signature.
    - Mark transaction failed.
    - Do not deduct reward points.
    - Do not add earned points.
```

---

## 7. Points Ledger Constraints

```yaml
points_constraints:
  balance_column: users.points_balance
  immutable_ledger: points_log
  negative_balance: forbidden
  direct_frontend_mutation: forbidden
  all_points_changes_must_create_log: true
  database_transaction_required_for:
    - full reward payment
    - partial reward payment webhook
    - referral bonus
    - purchase points earning
```

### Safe points mutation pattern

```sql
-- Conceptual transaction pattern
BEGIN;

-- Lock user row to prevent race condition
SELECT points_balance
FROM public.users
WHERE id = :user_id
FOR UPDATE;

-- Re-check sufficient balance before deduction
-- If insufficient, ROLLBACK.

UPDATE public.users
SET points_balance = points_balance - :points_to_redeem
WHERE id = :user_id
  AND points_balance >= :points_to_redeem;

INSERT INTO public.points_log (user_id, transaction_id, points_change, reason)
VALUES (:user_id, :transaction_id, -:points_to_redeem, 'reward_redeem');

COMMIT;
```

---

## 8. Idempotency Constraints

```yaml
idempotency:
  transaction_order_id:
    constraint: UNIQUE
    purpose: prevent duplicate bill orders
  razorpay_payment_id:
    constraint: process once
    purpose: prevent duplicate webhook point credits
  saved_offers:
    constraint: UNIQUE user_id + offer_id
  favorite_shops:
    constraint: PRIMARY KEY user_id + shop_id
  referral:
    constraint: user can be referred only once
```

### Required idempotency behavior

```yaml
idempotency_behavior:
  duplicate_webhook_for_completed_transaction:
    action: return 200 OK without changing points
  duplicate_reward_only_request:
    action: reject if transaction is not pending
  duplicate_qr_scan:
    action: return transaction current state, do not create new order
```

---

## 9. API Security Constraints

```yaml
api_security:
  cors:
    allowed_origins:
      - local_dev_origin
      - deployed_vercel_origin
    block_wildcard_in_production: true
  rate_limits:
    login_related: handled_by_auth_provider
    qr_validation: limit per user/IP
    merchant_qr_generation: limit repeated bill creation abuse
    webhook: no public rate-limit that blocks Razorpay, but signature verification required
  validation:
    library: zod_or_equivalent
    rules:
      amount: integer greater than 0
      lat_lng: numeric and valid ranges
      ids: uuid or strict order_id format
      reward_points: non_negative_integer
  error_handling:
    no_stack_traces_to_client: true
    generic_auth_errors: true
    structured_error_codes: true
```

---

## 10. Secret Management Constraints

```yaml
secret_management:
  never_commit:
    - SUPABASE_SERVICE_ROLE_KEY
    - QR_SECRET
    - RAZORPAY_KEY_SECRET
    - RAZORPAY_WEBHOOK_SECRET
  frontend_allowed:
    - VITE_SUPABASE_URL
    - VITE_SUPABASE_ANON_KEY
    - VITE_RAZORPAY_KEY_ID
  backend_only:
    - SUPABASE_SERVICE_ROLE_KEY
    - QR_SECRET
    - RAZORPAY_KEY_SECRET
    - RAZORPAY_WEBHOOK_SECRET
  git_requirements:
    - .env in .gitignore
    - .env.example with fake values only
```

---

## 11. Privacy Constraints

```yaml
privacy:
  personal_data:
    - name
    - email
    - phone
    - profile photo
    - location permission result
    - transaction history
  rules:
    - Do not store live customer location continuously.
    - Use customer location only for nearby shop query.
    - Do not expose phone/email of one customer to another customer.
    - Merchant should see transaction/payment status, not unnecessary customer private details.
    - Profile image must be stored with controlled access if Supabase Storage is used.
```

---

## 12. Threat Model

| Threat | Risk | Control |
|---|---|---|
| Forged QR token | Fake bill or manipulated amount | Signed JWT + DB match validation |
| Expired QR reuse | Payment confusion/fraud | 120-second expiry + DB expiry check |
| Client fake payment success | Free rewards without payment | Webhook-only success source |
| Duplicate webhook | Double points credit | Idempotent transaction finalization |
| Customer reads other data | Privacy breach | RLS + backend authorization |
| Merchant accesses another shop | Business data leak | owner_id checks + RLS |
| Negative points | Financial integrity issue | DB CHECK + row locks + server validation |
| Service key leak | Full database compromise | Backend-only env + never commit secrets |
| Geolocation misuse | Privacy concern | Do not persist live customer location unless explicitly needed |
| Replay of reward-only request | Points manipulation | Transaction status check + row lock |

---

## 13. Security Test Checklist

```yaml
security_test_checklist:
  authentication:
    - Call protected API without token returns 401.
    - Call protected API with invalid token returns 401.
    - Customer hitting merchant endpoint returns 403.
  qr:
    - Tampered QR token is rejected.
    - Expired QR token is rejected.
    - QR token with changed amount is rejected by DB match.
    - Already completed transaction cannot be paid again.
  payments:
    - Webhook with invalid signature is rejected.
    - Duplicate webhook does not add points twice.
    - Failed payment does not add points.
  rewards:
    - Full reward payment fails when points are insufficient.
    - Partial reward payment does not deduct points until payment succeeds.
    - Points balance never becomes negative under concurrent requests.
  rls:
    - Customer cannot read another customer profile.
    - Shopkeeper cannot read another shop's transactions.
    - Customer cannot create/update shop offers.
```

---

## 14. Production Hardening Notes

```yaml
future_hardening:
  - Add audit_logs table for sensitive operations.
  - Add background job to mark expired pending transactions.
  - Add device/session management.
  - Add merchant KYC if real money settlement goes live.
  - Add stricter abuse detection for repeated QR generation.
  - Add centralized logging and alerting for webhook failures.
  - Add backup/restore policy for Supabase database.
```
