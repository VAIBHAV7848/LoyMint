# LoyMint Development Walkthrough

We have successfully built, verified, and deployed the **LoyMint** monorepo application to your remote Supabase cloud environment! Below is a comprehensive breakdown of the architecture, database schema, payment flows, and remote deployment steps completed.

---

## 1. Monorepo Architecture

The project is structured as an npm workspaces monorepo:
* **Root Workspace**: Coordinates dependencies, workspace packages, and provides scripts for concurrent execution.
* **`apps/api` (Backend)**: Express API backend connecting to a PostgreSQL/PostGIS database. Handles secure token generation, points allocation triggers, and Razorpay signature verification webhooks.
* **`apps/web` (Frontend)**: React client compiled with Vite. Includes fully styled dark-theme glassmorphism pages for both Customer and Merchant views, using TailwindCSS and Outfit/Inter fonts.

---

## 2. Cloud Database Deployment (Supabase)

Using your Supabase access token, we have fully linked and deployed the database to your active project **`uarjabcsbpvcxtvdivez`** (ominaik017-create's Project):

### Actions Taken:
1. **Password Initialization**: Reset the remote database password to `postgresPassword123` via the Supabase Management API.
2. **Schema Migration**: Pushed [init_schema.sql](file:///home/nethunter/Desktop/OMKAR/supabase/migrations/20260602000000_init_schema.sql) containing all tables, geographic extensions (`postgis`), RLS policies, and triggers to the remote host.
3. **Database Seeding**: Ran a remote script connecting to the database pooler on port `6543` to seed standard user profiles, test merchants, mock shops, and starting points.

---

## 3. Frontend Pages & Components

We completed all page routes and user workflows:

### Customer App View:
1. **Login Page** (`/login`): Clean toggle between Customer/Merchant accounts. Logs in automatically using credentials or test emails.
2. **Dashboard Page** (`/customer/dashboard`): Visual display of points balance, saved offers carousel, favorite shops list, and recommended hotspots.
3. **Nearby Shops** (`/customer/shops`): Offers interactive radius distance sliders (1km-20km), category filter buttons, and browser Geolocation API triggers with Koramangala defaults.
4. **Shop Detail Profile** (`/customer/shop/:id`): Tabbed layout for Active Offers and About Shop details. Displays the shop earn/redeem rates.
5. **Scanner Page** (`/customer/scan`): Connects to the camera viewport using `html5-qrcode` to scan codes, with a manual textbox fallback to copy/paste secure tokens.
6. **Payment Preview** (`/customer/payment-preview/:id`): Ledger breakdown of the bill, points discount selector, and UPI checkout actions.
7. **Rewards Profile** (`/customer/rewards`): Point history ledger logging exact earnings and coupon redemption entries.
8. **Profile** (`/customer/profile`): Shareable invite-code blocks with click-to-copy handlers.

### Merchant App View:
1. **Dashboard** (`/merchant/dashboard`): Statistics cards (Total revenue, UPI volume, rewards discounted) and live sales updates.
2. **Shop Setup** (`/merchant/shop-setup`): Sliders to set earn/redeem rates and map GPS coordinates.
3. **Generate Bill QR** (`/merchant/generate-qr`): Numeric input triggers, secure QR rendering, 120s countdown timer, and live scan indicators.
4. **Offers Manager** (`/merchant/offers`): CRUD popups to add/edit/delete shop rewards.

---

## 4. Sandbox Integrations

### Razorpay UPI Simulator:
* When paying a bill on the frontend, if there is a remaining cash portion to pay, the system opens a custom simulator modal.
* Selecting **"Authorize UPI"** triggers a mock webhook capture payload inside the API server, immediately executing the ledger queries to award points and notify the merchant.

### Server-Sent Events (SSE) Push:
* Running at `/api/payment/stream?shopId=<id>`.
* The merchant dashboard subscribes to this stream. When the customer completes a payment, the backend broadcasts the receipt update. The merchant dashboard instantly flashes a chime toast and updates its stats without requiring manual refreshes!

---

## 5. Environment Settings

The environment configuration files have been populated with your cloud details:

### Backend Configuration (`apps/api/.env`):
```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://postgres.uarjabcsbpvcxtvdivez:postgresPassword123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://uarjabcsbpvcxtvdivez.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
MOCK_SERVICES=true
QR_SECRET=loymint-super-secure-qr-secret-key-1234567890
RAZORPAY_KEY_ID=rzp_test_SvCNMAK3CjtuNS
RAZORPAY_KEY_SECRET=G6D8znvt0hM1L6tuUKoCmSxh
```

### Frontend Configuration (`apps/web/.env`):
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SUPABASE_URL=https://uarjabcsbpvcxtvdivez.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
```
