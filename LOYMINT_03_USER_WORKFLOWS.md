<!--
Generated for: LoyMint
Source inputs: uploaded complete technical specification DOCX + customer app screen board image
Format: Markdown, workflow + Mermaid + YAML
-->
# LOYMINT — USER WORKFLOWS

```yaml
project: LoyMint
workflow_scope:
  - customer onboarding
  - merchant onboarding
  - merchant QR bill generation
  - customer QR scan and payment selection
  - normal UPI payment
  - full reward payment
  - partial reward plus UPI payment
  - realtime merchant confirmation
  - nearby shops
  - rewards, favourites, saved offers, referrals
```

---

## 1. Complete System Flow

```mermaid
flowchart TD
    A[Customer opens LoyMint] --> B[Login / Signup]
    B --> C[Customer Dashboard]
    C --> D[Discover Nearby Shops]
    C --> E[Tap Center Scan Button]

    M[Shopkeeper opens LoyMint Merchant] --> N[Login / Signup]
    N --> O[Create / Load Shop Profile]
    O --> P[Enter Bill Amount]
    P --> Q[Generate 2-Minute QR]

    E --> R[Scan Merchant QR]
    Q --> R
    R --> S[Backend validates signed QR token]
    S -->|Invalid / Expired| T[Show QR Error]
    S -->|Valid| U[Show Bill + Reward Preview]
    U --> V{Apply Rewards?}
    V -->|No| W[Normal UPI Payment]
    V -->|Yes| X{Can points cover full bill?}
    X -->|Yes| Y[Full Reward Payment]
    X -->|No| Z[Partial Reward + UPI]

    W --> AA[Razorpay Webhook Verified]
    Z --> AA
    Y --> AB[Backend deducts points directly]
    AA --> AC[Backend updates transaction + points]
    AB --> AC
    AC --> AD[Realtime update to merchant]
    AC --> AE[Customer sees success]
```

---

## 2. Customer Registration / Login Workflow

```mermaid
sequenceDiagram
    actor Customer
    participant UI as LoyMint Customer App
    participant Supabase as Supabase Auth
    participant API as Express API
    participant DB as PostgreSQL

    Customer->>UI: Open Login / Sign Up
    Customer->>UI: Enter email/phone or choose Google
    UI->>Supabase: Start auth flow
    Supabase-->>UI: Return authenticated session
    UI->>API: GET /api/me with Bearer token
    API->>DB: Find user profile by auth_user_id

    alt New customer
        API-->>UI: Profile not completed
        UI->>Customer: Ask name + optional referral code
        Customer->>UI: Submit profile
        UI->>API: POST /api/profile/complete
        API->>DB: Create user profile + referral bonus if valid
        API-->>UI: Return completed profile
    else Existing customer
        API-->>UI: Return user profile
    end

    UI->>Customer: Navigate to Dashboard
```

```yaml
customer_login_acceptance:
  - Customer can sign up/login using email, phone, or Google.
  - New customer must provide name before dashboard access.
  - Referral code is optional.
  - Invalid referral code does not block account creation but shows a warning.
  - Session expiry redirects customer to login.
```

---

## 3. Merchant Registration / Shop Setup Workflow

```mermaid
flowchart TD
    A[Merchant Login / Signup] --> B[Role = shopkeeper]
    B --> C{Shop profile exists?}
    C -->|No| D[Create Shop Profile]
    C -->|Yes| I[Merchant Dashboard]
    D --> E[Enter name, address, category]
    E --> F[Set earn and redeem rules]
    F --> G[Backend geocodes address]
    G -->|Success| H[Store PostGIS location]
    G -->|Failure| J[Ask for better address or manual lat/lng]
    H --> I
    J --> D
```

```yaml
shop_setup_rules:
  shop_name:
    required: true
    max_length: 100
  address:
    required: true
    geocoding: Nominatim
    fallback: manual latitude and longitude
  earn_points_per_100:
    required: true
    min: 0
  redeem_points_per_rupee:
    required: true
    min: 1
  owner:
    must_equal: authenticated shopkeeper user
```

---

## 4. Merchant Generate Bill + QR Workflow

```mermaid
sequenceDiagram
    actor Shopkeeper
    participant UI as LoyMint Merchant App
    participant API as Express API
    participant DB as PostgreSQL
    participant QR as QR Generator
    participant RT as Supabase Realtime

    Shopkeeper->>UI: Enter bill amount
    UI->>API: POST /api/merchant/bills/generate-qr
    API->>API: Verify JWT + role + shop ownership
    API->>API: Validate amount > 0
    API->>DB: Insert transaction status=pending, expires_at=now+120s
    API->>QR: Sign QR JWT and generate QR image
    API-->>UI: Return qrDataUrl, orderId, expiresAt
    UI->>Shopkeeper: Display QR + countdown timer
    UI->>RT: Subscribe to transaction updates
```

```yaml
qr_screen_states:
  idle:
    description: No active QR.
  generating:
    description: Merchant clicked generate and API request is running.
  waiting_for_payment:
    description: QR visible, countdown running, transaction status pending.
  payment_received:
    description: Status success, reward_paid, or partial_paid.
  expired:
    description: Countdown ended or backend marks transaction expired.
  failed:
    description: Razorpay payment failed or API error occurred.
```

---

## 5. Customer Scan QR Workflow

```mermaid
flowchart TD
    A[Customer taps center Scan button] --> B[Browser asks camera permission]
    B -->|Denied| C[Show permission help and retry button]
    B -->|Allowed| D[Open QR scanner]
    D --> E[Read signed QR token]
    E --> F[POST /api/payment/initiate-from-qr]
    F --> G{Backend validates token, status, expiry}
    G -->|Invalid token| H[Show invalid QR error]
    G -->|Expired| I[Show QR expired error]
    G -->|Already completed| J[Show already paid message]
    G -->|Valid| K[Show payment preview]
```

```yaml
scan_result_contract:
  valid_qr_response:
    orderId: string
    shopId: uuid
    shopName: string
    amount: integer
    earnRate: integer
    redeemRate: integer
    expiresAt: iso_datetime
  invalid_qr_errors:
    - QR_INVALID
    - QR_EXPIRED
    - TRANSACTION_NOT_FOUND
    - TRANSACTION_ALREADY_COMPLETED
    - TRANSACTION_NOT_PENDING
```

---

## 6. Reward Preview Workflow

```mermaid
flowchart TD
    A[Payment Preview Screen] --> B[Display bill amount and shop details]
    B --> C{Customer toggles Apply Rewards?}
    C -->|No| D[Mode = Normal UPI]
    C -->|Yes| E[Backend calculates max discount]
    E --> F[Show reward discount]
    F --> G[Show points to redeem]
    G --> H[Show remaining UPI amount]
    H --> I{Remaining UPI = 0?}
    I -->|Yes| J[Mode = Full Reward]
    I -->|No| K[Mode = Partial Reward + UPI]
```

```yaml
payment_preview_required_fields:
  - shop_name
  - bill_amount
  - available_points
  - earn_points_per_100
  - redeem_points_per_rupee
  - reward_discount_rupees
  - points_to_redeem
  - remaining_upi_amount
  - selected_payment_mode
critical_rule: UI may display calculations, but backend must be the source of truth.
```

---

## 7. Payment Case A — Normal UPI Payment

```mermaid
sequenceDiagram
    actor Customer
    participant UI as LoyMint Customer App
    participant API as Express API
    participant RZP as Razorpay Checkout
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant MerchantUI as LoyMint Merchant App

    Customer->>UI: Choose Pay without rewards
    UI->>API: POST /api/payment/create-order {orderId, rewardPointsToRedeem: 0}
    API->>DB: Validate transaction pending + not expired
    API->>RZP: Create Razorpay order for full amount
    API-->>UI: Return Razorpay order
    UI->>RZP: Open UPI checkout
    RZP-->>Customer: Payment completed or failed
    RZP->>API: POST webhook event
    API->>API: Verify webhook signature
    API->>DB: Update transaction status=success, upi_paid=amount
    API->>DB: Add earned points to points_log and users.points_balance
    DB-->>RT: Emit transaction UPDATE
    RT-->>MerchantUI: Payment received
    UI->>Customer: Show success after server confirmation
```

```yaml
normal_upi_rules:
  reward_points_used: 0
  reward_value_used: 0
  upi_paid: full_bill_amount
  point_earning_basis: upi_paid
  final_status: success
```

---

## 8. Payment Case B — Full Reward Payment

```mermaid
sequenceDiagram
    actor Customer
    participant UI as LoyMint Customer App
    participant API as Express API
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant MerchantUI as LoyMint Merchant App

    Customer->>UI: Apply rewards; remaining UPI = 0
    UI->>API: POST /api/payment/reward-only
    API->>DB: Start DB transaction
    API->>DB: Lock user row and transaction row
    API->>DB: Validate points balance and pending status
    API->>DB: Deduct points from user balance
    API->>DB: Insert negative points_log record
    API->>DB: Update transaction status=reward_paid
    API->>DB: Commit
    DB-->>RT: Emit transaction UPDATE
    RT-->>MerchantUI: Payment received via rewards
    API-->>UI: Return success
    UI->>Customer: Show reward payment success
```

```yaml
full_reward_rules:
  upi_paid: 0
  razorpay_required: false
  points_deducted: points_to_redeem
  points_earned: 0
  final_status: reward_paid
```

---

## 9. Payment Case C — Partial Reward + UPI

```mermaid
sequenceDiagram
    actor Customer
    participant UI as LoyMint Customer App
    participant API as Express API
    participant RZP as Razorpay
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant MerchantUI as LoyMint Merchant App

    Customer->>UI: Apply rewards; remaining UPI > 0
    UI->>API: POST /api/payment/create-order {orderId, rewardPointsToRedeem}
    API->>DB: Validate pending status, expiry, points balance
    API->>DB: Store reward_points_used and reward_value_used as reserved values
    API->>RZP: Create order for remaining UPI amount
    API-->>UI: Return Razorpay order
    UI->>RZP: Customer pays remaining amount
    RZP->>API: Send webhook
    API->>API: Verify webhook signature
    API->>DB: Start DB transaction
    API->>DB: Deduct reserved reward points
    API->>DB: Add earned points based on UPI paid
    API->>DB: Update transaction status=partial_paid
    API->>DB: Commit
    DB-->>RT: Emit transaction UPDATE
    RT-->>MerchantUI: Payment received with reward discount
    UI->>Customer: Show success after server confirmation
```

```yaml
partial_reward_rules:
  reward_points_used: points_to_redeem
  reward_value_used: reward_discount_rupees
  upi_paid: bill_amount - reward_discount_rupees
  points_earned_formula: floor(upi_paid / 100) * earn_points_per_100
  final_status: partial_paid
```

---

## 10. Merchant Realtime Confirmation Workflow

```mermaid
flowchart TD
    A[Merchant QR screen active] --> B[Subscribe to transactions table updates]
    B --> C[Transaction status changes]
    C --> D{New status}
    D -->|success| E[Show Payment Received]
    D -->|partial_paid| F[Show Payment Received with reward discount]
    D -->|reward_paid| G[Show Paid by Rewards]
    D -->|failed| H[Show Payment Failed]
    D -->|expired| I[Show QR Expired]
    E --> J[Allow Generate New Bill]
    F --> J
    G --> J
    H --> J
    I --> J
```

```yaml
merchant_confirmation_ui:
  waiting:
    message: Waiting for payment
    icon: loading
  success:
    message: Payment received
    fields:
      - total_amount
      - reward_discount
      - upi_paid
      - transaction_id
  failed:
    message: Payment failed. Generate a new QR if needed.
  expired:
    message: QR expired. Generate a new QR.
```

---

## 11. Nearby Shops Workflow

```mermaid
sequenceDiagram
    actor Customer
    participant UI as LoyMint Customer App
    participant Browser as Browser Geolocation
    participant API as Express API
    participant DB as PostgreSQL/PostGIS

    Customer->>UI: Open Nearby Shops
    UI->>Browser: Request current location
    alt Location granted
        Browser-->>UI: lat/lng
        UI->>API: GET /api/shops/nearby?lat=&lng=&radius=5
    else Location denied
        UI->>Customer: Show city dropdown
        Customer->>UI: Select city
        UI->>API: GET /api/shops/nearby with city center lat/lng
    end
    API->>DB: Run ST_DWithin + ST_Distance query
    DB-->>API: Return shops sorted by distance
    API-->>UI: Return shop cards
    UI->>Customer: Display nearby shops
```

```yaml
shop_card:
  required_fields:
    - shop_name
    - category
    - rating
    - distance_km
    - earn_rate
    - image_or_placeholder
    - favorite_button
  sorting: nearest_first
  filters:
    - category
    - search_text
```

---

## 12. Rewards and Offers Workflow

```mermaid
flowchart TD
    A[Open Rewards Page] --> B[Load available offers]
    B --> C[Display Available tab]
    B --> D[Display My Rewards tab]
    C --> E[Customer taps Save]
    E --> F[POST /api/user/saved-offers/:offerId]
    F --> G[Offer appears in Saved Offers]
    D --> H[Customer views saved rewards]
    H --> I[Reward can be redeemed in supported flow]
```

```yaml
offer_card:
  required_fields:
    - title
    - description
    - points_required
    - reward_type
    - shop_name
    - valid_until
    - save_button
```

---

## 13. Favourite Shops Workflow

```mermaid
flowchart TD
    A[Customer views shop card/detail] --> B[Tap heart icon]
    B --> C{Already favourite?}
    C -->|No| D[POST favorite shop]
    C -->|Yes| E[DELETE favorite shop]
    D --> F[Update UI immediately]
    E --> F
    F --> G[Profile > Favourite Shops updated]
```

```yaml
favorite_rules:
  uniqueness: one favorite_shops row per user_id + shop_id
  auth: customer only
  ui_behavior: optimistic update with rollback on API failure
```

---

## 14. Referral Workflow

```mermaid
sequenceDiagram
    actor ExistingUser
    actor NewUser
    participant UI as LoyMint App
    participant API as Express API
    participant DB as PostgreSQL

    ExistingUser->>UI: Open Refer & Earn
    UI-->>ExistingUser: Show referral code/share link
    ExistingUser->>NewUser: Shares code
    NewUser->>UI: Signs up with code
    UI->>API: Complete profile with referralCode
    API->>DB: Validate referral code
    API->>DB: Add bonus points to referrer
    API->>DB: Add bonus points to new user
    API->>DB: Insert points_log entries
    API-->>UI: Show referral success
```

```yaml
referral_rules:
  referral_code_generation: first_5_letters_of_name_plus_random_digits
  referral_bonus_points: 50
  self_referral: forbidden
  duplicate_referral_for_same_user: forbidden
  ledger_required: true
```

---

## 15. Profile Workflow

```yaml
profile_menu:
  header:
    - profile_photo
    - name
    - email
    - phone
    - points_balance
  menu_items:
    - My Transactions
    - My Rewards
    - Favourite Shops
    - Saved Offers
    - Refer & Earn
    - Help & Support
    - Logout
```

```mermaid
flowchart TD
    A[Open Profile] --> B[Load user profile]
    B --> C[Show points balance]
    C --> D[Customer selects menu item]
    D --> E{Menu item}
    E -->|Transactions| F[Show transaction history]
    E -->|Rewards| G[Show saved/redeemed rewards]
    E -->|Favourites| H[Show favourite shops]
    E -->|Saved Offers| I[Show saved offers]
    E -->|Refer & Earn| J[Show referral code]
    E -->|Logout| K[Clear session and redirect]
```

---

## 16. Edge Case Workflow Matrix

```yaml
edge_cases:
  qr_expired:
    backend_status: QR_EXPIRED
    frontend_action: show expired message and ask for new QR
  duplicate_payment_attempt:
    backend_status: TRANSACTION_ALREADY_COMPLETED
    frontend_action: block payment and show completed message
  insufficient_points:
    backend_action: calculate maximum possible discount
    frontend_action: offer partial reward + UPI
  razorpay_failed:
    backend_action: status failed, no points mutation
    frontend_action: show failure and retry guidance
  realtime_lost:
    frontend_action: show reconnecting and resubscribe
  geolocation_denied:
    frontend_action: show city fallback
  geocoding_failed:
    merchant_action: ask for specific address or manual lat/lng
  webhook_duplicate:
    backend_action: idempotent no-op if already processed
  negative_points_risk:
    backend_action: lock user row, re-check balance, rollback on failure
```
