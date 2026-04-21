# Trainly — Outdoor Fitness Discovery & Booking Platform

> Mobile-first outdoor fitness session discovery and booking for Lisbon.

---

## Project Structure

```
trainly/
├── apps/
│   ├── mobile/          # React Native + Expo (iOS + Android)
│   └── admin/           # Next.js admin dashboard
├── packages/
│   └── shared/          # Shared TypeScript types + constants
├── supabase/
│   ├── migrations/      # Postgres schema migrations
│   ├── seed/            # Seed data (Lisbon locations, badges, dev sessions)
│   └── functions/       # Edge Functions (Stripe webhook, check-in, payouts)
├── .env.example
└── package.json         # pnpm workspace root
```

---

## Quick Start

### Prerequisites
- Node 18+
- pnpm 8+
- Supabase CLI
- Expo CLI (`npm install -g expo-cli eas-cli`)
- Stripe CLI (for webhook testing)

### 1. Clone and install

```bash
git clone <your-repo>
cd trainly
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill in Supabase, Stripe, and Mapbox credentials
```

### 3. Start local Supabase

```bash
pnpm supabase:start
# Runs on http://localhost:54323 (Studio)
```

### 4. Run migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start the mobile app

```bash
pnpm mobile
# Scan QR code with Expo Go on Android
```

### 6. Start the admin dashboard

```bash
pnpm admin
# http://localhost:3001
```

---

## Development & Testing

### Dev Mode

Set `EXPO_PUBLIC_DEV_MODE=true` in your `.env`.

A red **DEV** badge appears in the bottom-right corner of the mobile app.

Tap it to:
- Quick-login with seeded test accounts
- Simulate any role without re-logging in
- Sign out instantly

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| User Free | `dev.free@trainly.app` | `Trainly2024!` |
| User Plus | `dev.plus@trainly.app` | `Trainly2024!` |
| Trainer Pending | `dev.pending@trainly.app` | `Trainly2024!` |
| Trainer | `dev.trainer@trainly.app` | `Trainly2024!` |
| Coach Pro | `dev.coach@trainly.app` | `Trainly2024!` |
| Admin | `dev.admin@trainly.app` | `Trainly2024!` |

Create these via Supabase Dashboard → Authentication → Users, or with:
```bash
supabase auth admin create-user --email dev.trainer@trainly.app --password Trainly2024!
```

### Seed dev sessions
After creating the trainer dev user profile, call:
```sql
SELECT seed_dev_sessions('<trainer-profile-id>');
```

---

## Architecture

### Mobile App (`apps/mobile`)

- **Framework:** Expo SDK 51 + Expo Router v3
- **Navigation:** File-based routing (`src/app/`)
- **State:** Zustand (auth, map filters) + TanStack Query (server state)
- **Maps:** Mapbox via `@rnmapbox/maps`
- **Payments:** `@stripe/stripe-react-native`
- **i18n:** i18next, Portuguese default, English supported
- **Design system:** Custom tokens in `src/constants/`

#### Key screens:
| Route | Description |
|-------|-------------|
| `/(auth)/welcome` | Landing / splash |
| `/(auth)/signup` | Registration with role path choice |
| `/(auth)/onboarding` | 4-step onboarding + location consent |
| `/(app)/(tabs)/` | Map discovery (Mapbox) |
| `/(app)/(tabs)/sessions` | Sessions list (upcoming/past/explore) |
| `/(app)/(tabs)/progress` | XP, levels, body progress, badges |
| `/(app)/(tabs)/profile` | User profile, settings, role info |
| `/(app)/session/[id]` | Session detail + booking CTA |
| `/(app)/trainer/apply` | Multi-step trainer application |
| `/(app)/trainer/dashboard` | Trainer earnings, sessions, analytics |

### Admin Dashboard (`apps/admin`)

- **Framework:** Next.js 14 App Router + Tailwind CSS
- **Auth:** Supabase SSR auth (admin role gate)
- **API routes:** `/api/trainers/[id]/review` etc.

#### Key pages:
| Route | Description |
|-------|-------------|
| `/dashboard` | Overview stats |
| `/trainers` | Applications queue + active trainers |
| `/trainers/[id]` | Application detail with approve/reject |
| `/users` | User management |
| `/sessions` | Session overview |
| `/disputes` | Open disputes |
| `/refunds` | Refund management |
| `/payouts` | Payout tracking |
| `/analytics` | Platform metrics |

### Supabase Edge Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `stripe-webhook` | Stripe webhook | Payment events, subscriptions, transfers |
| `handle-checkin` | Mobile app call | GPS + timing validation for attendance |
| `process-payout` | Post-session cron | Escrow release, refunds, no-show logic |

---

## Business Logic Summary

### Payment Flow
1. User books → Stripe PaymentIntent captured
2. Session completes → `process-payout` triggered
3. GPS-validated attendees → trainer receives `amount × (1 - commission_rate)`
4. No-shows → partial refund per policy
5. Trainer no-show → full refund + strike logged

### Commission Rates
- Default: **10%**
- Early trainer (first 90 days): **5%**
- Configurable per trainer via `trainer_since` timestamp

### Refund Policy
| Cancellation Time | User Refund |
|---|---|
| > 12h before | 100% |
| 2–12h before | 50% |
| < 2h before | 0% |
| Trainer no-show | 100% |

### Check-in Validation
- Must be within **200 meters** of session location
- Within window: **15 min before** to **30 min after** start
- Validated check-in required for XP award and payout trigger

### XP System
| Action | XP |
|---|---|
| Daily login | +10 |
| Book session | +10 |
| Attend session (validated) | +100 |
| Leave review | +25 |
| First session | +150 |
| Complete profile | +50 |

---

## Database Schema

Key tables (full schema in `supabase/migrations/001_initial_schema.sql`):

- `profiles` — extends Supabase auth users, stores role + XP + Stripe IDs
- `trainer_applications` — multi-step application with documents
- `sessions` — both trainer-led and social groups
- `session_participants` — bookings with status tracking
- `checkins` — GPS + time validated attendance
- `payments` / `payouts` / `refunds` — full financial ledger
- `reviews` / `trainer_review_summary` — star ratings with aggregation
- `xp_logs` / `user_progress_body_areas` — gamification
- `curated_locations` — Lisbon outdoor spots (seeded)
- `admin_actions` — full audit trail

---

## Deployment

### Mobile (Android first)
```bash
# Preview build for testing
pnpm build:android

# Production
pnpm build:android:prod
```

Configure `eas.json` with your EAS project ID from `app.json`.

### Admin Dashboard (Vercel)
```bash
cd apps/admin
vercel deploy
```

Set environment variables in Vercel dashboard matching `.env.example`.

### Supabase Edge Functions
```bash
supabase functions deploy stripe-webhook
supabase functions deploy handle-checkin
supabase functions deploy process-payout
```

Set secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Logo

Place your Trainly logo at:
- `apps/mobile/assets/images/logo.png` (used in welcome screen)
- `apps/mobile/assets/images/icon.png` (app icon)
- `apps/mobile/assets/images/splash.png` (splash screen)
- `apps/mobile/assets/images/adaptive-icon.png` (Android adaptive)

Brand colors: `#1B6FEB` (blue), `#F5A623` (accent), `#1B2A4A` (dark navy)

---

## Roadmap

### Phase 1 — Core MVP ✅
- [x] Project setup + monorepo
- [x] Auth + onboarding
- [x] Role system
- [x] Map discovery (Mapbox)
- [x] Sessions listing + detail
- [x] Trainer application flow
- [x] Admin review dashboard
- [x] Dev testing shortcuts
- [x] Database schema + seed data

### Phase 2 — Business Critical
- [ ] Full Stripe Connect onboarding flow
- [ ] Booking + payment UI (`/(app)/session/book/[id]`)
- [ ] Trainer Create Session screen
- [ ] Check-in UI with GPS
- [ ] Review submission
- [ ] Trainer dashboard (full)
- [ ] Pause/vacation mode

### Phase 3 — Retention & Polish
- [ ] Full XP + level UI
- [ ] Badge unlock toasts
- [ ] Body progress tracking
- [ ] Boost purchase flow
- [ ] Analytics for trainers
- [ ] Push notifications
- [ ] Localization polish
- [ ] App Store / Play Store submission

---

## Tech Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Mobile framework | Expo SDK 51 | OTA updates, EAS builds, fast iteration |
| Navigation | Expo Router v3 | File-based, deep linking, type-safe |
| Map | Mapbox | Best mobile performance, custom styles |
| Auth | Supabase Auth | Integrated with DB, RLS, easy setup |
| Payments | Stripe Connect Express | Marketplace escrow, automatic payouts |
| Admin | Next.js App Router | SSR for admin security, Vercel deploy |
| State | Zustand + TanStack Query | Minimal complexity, great DX |
| i18n | i18next | Battle-tested, React Native + Next.js |

---

*Built with ❤️ for Lisbon's outdoor fitness community.*
