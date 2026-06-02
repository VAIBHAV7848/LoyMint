<!--
Generated for: LoyMint
Source inputs: uploaded complete technical specification DOCX + customer app screen board image
Format: Markdown, developer-ready, code/PRD friendly
-->
# LOYMINT — PRODUCT REQUIREMENTS DOCUMENT

```yaml
product_name: LoyMint
full_name: LoyMint – Local Rewards & QR Payments
tagline: Scan. Pay. Earn Local Rewards.
product_type: Mobile-first loyalty + QR payment web platform
build_type: React web app / PWA-ready MVP
primary_users:
  - Customer
  - Shopkeeper / Merchant
  - Backend System
mvp_positioning: Demo-ready product with production-grade architecture guardrails
brand_map:
  product_name: LoyMint
  customer_app: LoyMint Customer
  merchant_app: LoyMint Merchant
  points_name: LoyMint Points
```

---

## 1. Executive Summary

LoyMint is a mobile-first web platform for local-shop loyalty. Customers discover nearby shops, scan a merchant-generated QR code, pay using UPI or reward points, earn loyalty points, redeem offers, and track transactions. Shopkeepers create bills, generate secure 2-minute QR codes, define their own earn/redeem rules, and receive real-time payment confirmation after successful payment.

The product should feel like a premium customer app even though it is implemented as a web application. The customer screen board establishes the required UX direction: deep purple brand identity, mobile card layout, bottom navigation, center floating scan button, points wallet, nearby shops, rewards/offers, and profile management.

---

## 2. Problem Statement

```yaml
problem:
  customers:
    - Local-shop loyalty is fragmented, manual, and hard to track.
    - Customers forget physical loyalty cards or cannot calculate reward value clearly.
    - Payment and reward confirmation are usually separate and slow.
  shopkeepers:
    - Small shops cannot easily run digital loyalty programs.
    - Manual point tracking creates fraud, mistakes, and disputes.
    - Shopkeepers need reliable payment confirmation instead of trusting screenshots.
  system_gap:
    - Existing UPI payment flow does not automatically connect payment, rewards, and shop-specific loyalty rules.
```

---

## 3. Product Goals

```yaml
goals:
  G1: Allow customers to earn loyalty points from verified purchases at local shops.
  G2: Allow shopkeepers to generate secure bill QR codes that expire in exactly 2 minutes.
  G3: Support three payment modes: normal UPI, full reward payment, and partial reward plus UPI.
  G4: Calculate all points and reward discounts on the backend, never only on the client.
  G5: Show real-time payment confirmation to the shopkeeper without manual refresh.
  G6: Show nearby shops using real distance calculation through PostGIS.
  G7: Provide a polished, mobile-first customer UI matching the supplied screen direction.
  G8: Prevent duplicate payments, expired QR usage, fake payment success, and negative points.
```

---

## 4. Product Non-Goals For MVP

```yaml
non_goals:
  - Native Android or iOS application.
  - Cash transaction tracking.
  - Full merchant KYC, banking settlement automation, GST automation, or legal compliance platform.
  - Admin super-panel, unless added in a later phase.
  - AI recommendation engine; UI can reserve space for future recommendations.
  - Offline payment support.
  - Cross-shop universal point redemption; redemption rate remains shop-specific.
```

---

## 5. User Personas

### 5.1 Customer

```yaml
persona: Customer
example_name: Rohan Sharma
primary_job: Earn and redeem rewards from nearby local shops while paying digitally.
needs:
  - Fast login/signup using email, phone, or Google.
  - See current points balance on dashboard.
  - Discover nearby shops by distance, category, rating, and earn rate.
  - Scan shop QR quickly using a bottom-center floating button.
  - Understand reward discount before payment.
  - Track transactions, saved offers, favourite shops, and referral rewards.
frictions:
  - Does not want complicated reward math.
  - Does not want to wait after payment.
  - Needs clear error messages if QR expires or payment fails.
```

### 5.2 Shopkeeper / Merchant

```yaml
persona: Shopkeeper
primary_job: Generate bills, accept UPI payments, and run shop-specific loyalty rules.
needs:
  - Register and manage shop profile.
  - Set earn points per ₹100 spent.
  - Set redeem points required per ₹1 discount.
  - Generate 2-minute bill QR codes.
  - Receive real-time payment confirmation.
  - Create offers that customers can save or redeem.
frictions:
  - Cannot rely on customer payment screenshots.
  - Needs fraud-resistant QR and transaction handling.
  - Needs simple UI that works during busy counter operations.
```

---

## 6. MVP Feature Scope

### 6.1 Customer App Features

```yaml
customer_app:
  authentication:
    - Login/signup by email or phone.
    - Google login support.
    - New-user profile completion.
    - Optional referral code input.
  dashboard:
    - Personalized greeting.
    - Points balance card.
    - Recent transactions.
    - Recommended offers or shops.
  nearby_shops:
    - Browser geolocation request.
    - City fallback if location is denied.
    - Shop list sorted by distance.
    - Search by shop name/category.
    - Category filters such as All, Cafes, Restaurants, Salons.
  shop_detail:
    - Shop banner/photo.
    - Name, rating, distance, category, open/closed status.
    - Earn points rule.
    - Offers section.
    - Scan QR to earn/pay.
  scan_and_pay:
    - Bottom-center floating scan button.
    - Camera scanner using QR.
    - Backend QR validation.
    - Reward calculation preview.
    - Normal UPI payment.
    - Full reward payment.
    - Partial reward plus UPI payment.
  rewards:
    - Available offers list.
    - My rewards tab.
    - Save offer.
    - Show points required.
  profile:
    - Profile photo/name/email/phone.
    - Points balance.
    - My transactions.
    - My rewards.
    - Favourite shops.
    - Saved offers.
    - Refer and earn.
    - Help and support.
    - Logout.
```

### 6.2 Merchant App Features

```yaml
merchant_app:
  authentication:
    - Merchant login/signup.
    - Role stored as shopkeeper.
  shop_profile:
    - Shop name.
    - Full address.
    - Geocoded PostGIS location.
    - Category.
    - Earn points per ₹100.
    - Redeem points per ₹1.
  billing:
    - Enter bill amount.
    - Generate QR.
    - Show QR code image.
    - Show 2-minute countdown.
    - Show waiting-for-payment state.
  realtime_confirmation:
    - Payment received state.
    - Failed payment state.
    - Expired QR state.
    - Display total amount, points discount, and UPI amount.
  offers:
    - Create offer.
    - Update offer.
    - Delete offer.
    - Set points required and reward type.
```

---

## 7. Required Customer Screens

| No. | Screen | Purpose | Core Components | Acceptance Criteria |
|---:|---|---|---|---|
| 1 | Login / Sign Up | Authenticate customer | Logo, email/phone, password/OTP, Google, phone login | Valid user reaches dashboard; invalid credentials show clear error |
| 2 | Home Dashboard | Main customer overview | Greeting, points balance, recent transactions, recommended offers | Points and recent data load from backend; scan button visible |
| 3 | Nearby Shops | Discover shops | Location, search, filters, shop cards | Shops sorted by distance and show rating + earn rate |
| 4 | Shop Detail | View shop info | Header image, name, rating, distance, earn rule, about, scan CTA | Scan/pay can start from this context |
| 5 | Rewards & Offers | View and save rewards | Available tab, My Rewards tab, points cost cards | User can save offers and view saved rewards |
| 6 | Profile | Account and activity | Photo, name, email, phone, points, menu list | User can open transactions, rewards, favourites, saved offers, referral, logout |

---

## 8. UI / UX Requirements

```yaml
visual_direction:
  brand_name: LoyMint
  tone: Premium local fintech, friendly, clean, trustworthy
  primary_color: Deep purple gradient
  supporting_colors:
    orange: medium-value discount offers
    green: high-value rewards/cashback-style offers
    blue: free-item rewards
  typography: Clean mobile-first sans-serif with strong hierarchy
  layout:
    - Rounded mobile cards
    - High whitespace
    - Clear CTA buttons
    - Bottom navigation
    - Center floating scan action
  icon_style: Minimal line icons
  accessibility:
    - Minimum 44px tappable targets
    - Visible focus states
    - Sufficient contrast
    - Error messages near inputs
    - Scanner permission fallback screen
```

### Bottom Navigation Contract

```yaml
bottom_navigation:
  items:
    - Home
    - Shops
    - Scan
    - Rewards
    - Profile
  scan_button:
    placement: bottom_center
    type: floating_action_button
    priority: highest
    behavior: opens_camera_qr_scanner
```

---

## 9. Business Rules

```yaml
business_rules:
  QR_EXPIRY_SECONDS: 120
  points_earn_formula: floor(upi_paid / 100) * shop.earn_points_per_100
  max_discount_rupees_formula: floor(user.points_balance / shop.redeem_points_per_rupee)
  reward_discount_formula: min(max_discount_rupees, transaction.amount)
  points_to_redeem_formula: reward_discount * shop.redeem_points_per_rupee
  remaining_upi_formula: transaction.amount - reward_discount
  referral_bonus_points: 50
  transaction_statuses:
    - pending
    - success
    - failed
    - reward_paid
    - partial_paid
    - expired
  payment_modes:
    normal_upi:
      reward_points_used: 0
      upi_paid: full_bill_amount
    full_reward:
      reward_points_used: points_to_redeem
      upi_paid: 0
    partial_reward_upi:
      reward_points_used: points_to_redeem
      upi_paid: remaining_upi
```

---

## 10. Data Requirements

```yaml
main_entities:
  users:
    stores: customer_or_shopkeeper_profile_points_role_referral
  shops:
    stores: merchant_shop_profile_location_reward_rules_rating
  transactions:
    stores: order_amount_reward_usage_upi_amount_status_expiry_payment_reference
  points_log:
    stores: immutable_points_ledger
  offers:
    stores: shop_created_reward_offers
  favorite_shops:
    stores: customer_shop_favourites
  saved_offers:
    stores: customer_saved_offers
  addresses:
    stores: future_customer_address_targeting
```

---

## 11. API Capability Requirements

```yaml
api_capabilities:
  auth:
    - verify session
    - complete profile
    - apply referral code
  shops:
    - get nearby shops
    - get shop detail
    - create/update merchant shop
  qr_and_payment:
    - generate merchant bill QR
    - validate scanned QR
    - preview reward discount
    - create Razorpay order
    - handle reward-only payment
    - handle Razorpay webhook
  user:
    - get transactions
    - get points log
    - favorite shop
    - save offer
    - get referral code
  merchant:
    - get active QR state
    - get transaction updates
    - manage offers
```

---

## 12. Non-Functional Requirements

```yaml
performance:
  dashboard_load_target: under 2 seconds on normal 4G
  qr_validation_target: under 700 ms server response
  nearby_shop_query_target: under 1 second for demo dataset
  realtime_update_target: under 3 seconds after backend status update
security:
  qr_tokens_signed: true
  qr_expiry: 120 seconds
  payment_success_source: Razorpay webhook only
  server_side_points_calculation: required
  rls_enabled: all tables
reliability:
  duplicate_webhook_handling: idempotent
  negative_points: impossible through DB transaction
  geolocation_denied_fallback: required
compatibility:
  mobile_browsers:
    - Chrome Android
    - Safari iOS basic support
    - Firefox Android basic support
  desktop_support: responsive fallback for demo/testing
observability:
  backend_logs:
    - auth failure
    - QR validation failure
    - webhook signature failure
    - payment status update
    - point ledger updates
```

---

## 13. Error Handling Requirements

| Scenario | Required Handling |
|---|---|
| QR expired | Show: `This QR code has expired. Ask the shopkeeper to generate a new one.` |
| Duplicate scan | Backend returns completed/in-progress status; frontend blocks new payment attempt |
| Invalid QR token | Show invalid QR message and close scanner safely |
| Insufficient points | Auto-convert to partial reward if possible |
| Payment failed | Mark transaction failed; do not add/deduct points incorrectly |
| Amount <= 0 | Merchant bill generation rejected |
| Geolocation denied | Show city dropdown fallback |
| Geocoding failed | Ask merchant for specific address or manual lat/lng |
| Webhook signature mismatch | Reject webhook with 400 and log security event |
| Realtime disconnect | Merchant UI shows reconnecting state and resubscribes |

---

## 14. Acceptance Criteria

```yaml
mvp_acceptance_criteria:
  AC1: Customer can signup/login and view dashboard.
  AC2: Customer can discover nearby shops using live location or city fallback.
  AC3: Merchant can create shop profile and generate a bill QR.
  AC4: Generated QR expires after 2 minutes and expired QR cannot be used.
  AC5: Customer can scan QR and view bill/payment preview.
  AC6: Normal UPI payment updates transaction and awards points after webhook confirmation.
  AC7: Full reward payment deducts points and completes transaction without Razorpay.
  AC8: Partial reward plus UPI deducts points and awards new points only after verified payment.
  AC9: Merchant receives realtime payment status update.
  AC10: Customer can view rewards, save offers, favourite shops, and transaction history.
  AC11: Backend prevents negative points, duplicate success, invalid QR, and unauthorized access.
```

---

## 15. Implementation Roadmap

```yaml
phase_1_foundation:
  - Create React Vite project.
  - Configure Tailwind, router, auth provider, API client.
  - Create Supabase project and schema.
  - Enable PostGIS and RLS.
phase_2_customer_core:
  - Login/signup screens.
  - Customer dashboard.
  - Nearby shops page.
  - Shop detail page.
  - Bottom navigation and scan FAB.
phase_3_merchant_core:
  - Merchant auth route.
  - Shop profile setup.
  - Bill form.
  - QR generation and countdown.
phase_4_payment_core:
  - QR signed JWT generation.
  - QR validation.
  - Reward preview API.
  - Razorpay test order.
  - Razorpay webhook verification.
  - Points ledger transaction logic.
phase_5_rewards_and_profile:
  - Offers page.
  - Save offers.
  - Favourite shops.
  - Profile menu.
  - Referral code and bonus.
phase_6_hardening:
  - Error states.
  - Idempotency.
  - Realtime reconnect logic.
  - Test cases.
  - Demo seed data.
```

---

## 16. Demo Readiness Checklist

```yaml
demo_checklist:
  - Seed at least 5 shops with categories, ratings, reward rules, and PostGIS locations.
  - Create one customer with points balance.
  - Create one merchant with one shop.
  - Verify QR expiry after 2 minutes.
  - Verify normal payment flow in Razorpay test mode.
  - Verify full reward flow.
  - Verify partial reward plus UPI flow.
  - Verify merchant realtime confirmation.
  - Verify nearby shop sorting by distance.
  - Verify mobile layout on 390px width.
```
