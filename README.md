# GCash Subscription Manager — Next.js

Rebuilt in **Next.js 16 App Router** + **Tailwind CSS v4** + **Supabase**.

## Structure

```
app/
  layout.jsx              # Root layout + AuthProvider
  page.jsx                # → redirects to /login
  login/page.jsx          # Login
  register/page.jsx       # Register
  (auth)/
    layout.jsx            # Auth guard
    dashboard/page.jsx    # My Subscriptions
    apps/page.jsx         # Browse Apps marketplace

components/
  GLogo.jsx               # "G" logo badge
  LoginAside.jsx          # Left decorative panel
  PinInput.jsx            # 6-digit MPIN with auto-advance
  Sidebar.jsx             # Desktop sidebar
  SubscriptionCard.jsx    # Subscription row card
  AppCard.jsx             # Marketplace app tile

context/
  AuthContext.jsx         # Session (localStorage)

lib/
  supabase.js             # Lazy Supabase client
  appsData.js             # Static app catalog
```

## Setup

### 1. Install
```bash
npm install
```

### 2. Supabase tables

**`users`** — `id` (uuid PK), `name` (text), `phone` (text)

**`subscriptions`** — `id`, `user_id` (FK), `app_id`, `name`, `icon`, `color`, `price`, `status`, `next_billing`, `created_at`

Enable RLS so users can only access their own rows.

### 3. Env vars (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run
```bash
npm run dev
```

> Auth uses `phone@gcash.local` as email and MPIN as password via Supabase Auth.
