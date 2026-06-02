# LoyMint – Local Rewards & QR Payments

LoyMint is a mobile-first loyalty and direct peer-to-peer (P2P) QR payment platform. It enables local merchants to launch customized loyalty rewards programs instantly, and allows customers to pay dynamically using standard UPI applications (like GPay, PhonePe, Paytm, or BHIM) while auto-redeeming rewards points at checkout.

---

## 🚀 Key Features

* **Zero-Fee Direct P2P UPI Payments**: Cut out payment gateway fees. Payments go directly from the customer's bank account to the merchant's bank account via dynamic QR code generation.
* **Intelligent Auto-Verification Checklists**: Provides an instant bank-settlement loader sequence when the customer returns from their UPI app, removing manual UTR/reference number inputs.
* **Real-Time Merchant Dashboards**: Merchant screens update automatically to show transaction confirmation using Server-Sent Events (SSE) and background database polling.
* **Smart Geolocation Offers**: Promotes local shops dynamically based on the user's distance using PostGIS geospatial queries.
* **Unified Serverless Architecture**: Frontend and backend are bundled under a single Vercel deployment profile to eliminate CORS and mixed-content connection errors.

---

## 📂 Repository Structure

The project is structured as a standard Node.js monorepo using npm workspaces:

```txt
├── apps
│   ├── api              # Express.js REST API serverless microservice
│   └── web              # React + Vite client frontend SPA
├── vercel.json          # Unified serverless deployment configuration
├── package.json         # Workspace manifest
└── supabase             # DB schema migrations and seeding files
```

---

## 🔧 Local Setup Guide

Follow these steps to configure and launch LoyMint locally:

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Install Workspace Dependencies
From the repository root, run:
```bash
npm install
```

### 3. Environment Variables Config
Create file `.env` inside `apps/api` with:
```env
PORT=8080
DATABASE_URL="your-supabase-connection-string"
JWT_SECRET="your-jwt-signing-secret"
VITE_API_BASE_URL="http://localhost:8080/api"
```

Create file `.env` inside `apps/web` with:
```env
VITE_API_BASE_URL="http://localhost:8080/api"
```

### 4. Running the App
Start both backend API and frontend client concurrently:
```bash
npm run dev
```
* **Frontend SPA**: Runs at `http://localhost:5173`
* **Backend API**: Runs at `http://localhost:8080`

---

## 🌐 Production Deployment

### Database (Supabase)
Deploy schema migrations to your cloud PostgreSQL database:
```bash
psql "postgresql://postgres:[password]@db.uarjabcsbpvcxtvdivez.supabase.co:5432/postgres" -f supabase/migrations/20260602000000_init_schema.sql
```

### Vercel Serverless Hosting
Ensure you have configured Vercel env variables matching `.env`. To trigger build:
```bash
git push origin main
```
The edge routers defined in `vercel.json` will automatically build the React assets and proxy `/api/*` requests directly to the backend serverless router.
