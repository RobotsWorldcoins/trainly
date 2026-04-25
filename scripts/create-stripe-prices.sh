#!/usr/bin/env bash
# ============================================================
# TrainyX – Create 6 Stripe prices + set Supabase secrets
# ============================================================
# Prerequisites:
#   - bash (Git Bash on Windows, or WSL/macOS terminal)
#   - curl available on PATH
#   - node/npx available on PATH
#
# Steps:
#   1. Open Stripe Dashboard → Developers → API Keys
#      Click "Reveal live key" and copy sk_live_...
#   2. Open https://supabase.com/dashboard/account/tokens
#      Generate a new token and copy it
#   3. Fill in STRIPE_SECRET_KEY and SUPABASE_ACCESS_TOKEN below
#   4. Run:  bash scripts/create-stripe-prices.sh
# ============================================================

set -euo pipefail

# ─── FILL THESE IN ─────────────────────────────────────────
STRIPE_SECRET_KEY="sk_live_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY"
SUPABASE_ACCESS_TOKEN="REPLACE_WITH_NEW_SUPABASE_PAT"
SUPABASE_PROJECT_REF="mrxnwdvsfalwlpbhmsap"

# ── Prices already created 2026-04-25 ─────────────────────────
# If re-running, set these directly and skip the price creation block
EXISTING_STRIPE_PRICE_USER_PLUS_MONTHLY="price_1TQ8Re7RLKcygREl0Ys3fuvA"
EXISTING_STRIPE_PRICE_USER_PLUS_ANNUAL="price_1TQ8Rw7RLKcygRElEaLFYMx3"
EXISTING_STRIPE_PRICE_TRAINER_MONTHLY="price_1TQ8Rx7RLKcygRElLRhMbAqL"
EXISTING_STRIPE_PRICE_TRAINER_ANNUAL="price_1TQ8Rx7RLKcygRElumL973ci"
EXISTING_STRIPE_PRICE_COACH_PRO_MONTHLY="price_1TQ8Ry7RLKcygRElz1JE1fK0"
EXISTING_STRIPE_PRICE_COACH_PRO_ANNUAL="price_1TQ8Rz7RLKcygRElVHRpZHiy"
# ───────────────────────────────────────────────────────────

if [[ "$STRIPE_SECRET_KEY" == sk_live_REPLACE* ]]; then
  echo "❌  Please set STRIPE_SECRET_KEY to your real sk_live_... key."
  echo "    Get it from: Stripe Dashboard → Developers → API Keys"
  exit 1
fi

if [[ "$SUPABASE_ACCESS_TOKEN" == REPLACE* ]]; then
  echo "❌  Please set SUPABASE_ACCESS_TOKEN to a new Supabase PAT."
  echo "    Get it from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

echo "🔧  Creating 6 Stripe prices…"
echo ""

# Helper: create a recurring price and return its ID
create_price() {
  local nickname="$1"
  local amount="$2"   # in cents
  local interval="$3" # month | year

  local response
  response=$(curl -s https://api.stripe.com/v1/prices \
    -u "${STRIPE_SECRET_KEY}:" \
    -d "currency=eur" \
    -d "unit_amount=${amount}" \
    -d "recurring[interval]=${interval}" \
    -d "product_data[name]=${nickname}" \
    -d "nickname=${nickname}")

  # Extract id field using bash only (no python needed)
  local id
  id=$(echo "$response" | grep -o '"id": *"[^"]*"' | head -1 | sed 's/.*"id": *"\([^"]*\)".*/\1/')

  if [[ "$id" != price_* ]]; then
    echo "  ❌  Failed to create price '$nickname'"
    echo "      Response: $response"
    exit 1
  fi

  echo "$id"
}

P_USER_PLUS_MONTHLY=$(create_price  "TrainyX User Plus – Mensal"   499   month)
echo "  ✅  User Plus Mensal     → $P_USER_PLUS_MONTHLY"

P_USER_PLUS_ANNUAL=$(create_price   "TrainyX User Plus – Anual"    3999  year)
echo "  ✅  User Plus Anual      → $P_USER_PLUS_ANNUAL"

P_TRAINER_MONTHLY=$(create_price    "TrainyX Trainer – Mensal"     1900  month)
echo "  ✅  Trainer Mensal       → $P_TRAINER_MONTHLY"

P_TRAINER_ANNUAL=$(create_price     "TrainyX Trainer – Anual"      15900 year)
echo "  ✅  Trainer Anual        → $P_TRAINER_ANNUAL"

P_COACH_PRO_MONTHLY=$(create_price  "TrainyX Coach Pro – Mensal"   3900  month)
echo "  ✅  Coach Pro Mensal     → $P_COACH_PRO_MONTHLY"

P_COACH_PRO_ANNUAL=$(create_price   "TrainyX Coach Pro – Anual"    31900 year)
echo "  ✅  Coach Pro Anual      → $P_COACH_PRO_ANNUAL"

echo ""
echo "🔒  Setting Supabase edge function secrets…"

SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx --yes supabase@latest secrets set \
  --project-ref "$SUPABASE_PROJECT_REF" \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_PRICE_USER_PLUS_MONTHLY="$P_USER_PLUS_MONTHLY" \
  STRIPE_PRICE_USER_PLUS_ANNUAL="$P_USER_PLUS_ANNUAL" \
  STRIPE_PRICE_TRAINER_MONTHLY="$P_TRAINER_MONTHLY" \
  STRIPE_PRICE_TRAINER_ANNUAL="$P_TRAINER_ANNUAL" \
  STRIPE_PRICE_COACH_PRO_MONTHLY="$P_COACH_PRO_MONTHLY" \
  STRIPE_PRICE_COACH_PRO_ANNUAL="$P_COACH_PRO_ANNUAL"

echo ""
echo "🚀  Deploying edge functions…"

SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase@latest functions deploy \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --use-api

echo ""
echo "🎉  TrainyX billing is LIVE!"
echo ""
echo "    ╔══════════════════════════════════════════════════════╗"
echo "    ║  NEXT: Configure Stripe Webhook                     ║"
echo "    ║                                                      ║"
echo "    ║  URL: https://mrxnwdvsfalwlpbhmsap.functions.       ║"
echo "    ║       supabase.co/stripe-webhook                    ║"
echo "    ║                                                      ║"
echo "    ║  Events to listen to:                               ║"
echo "    ║    • payment_intent.succeeded                       ║"
echo "    ║    • payment_intent.payment_failed                  ║"
echo "    ║    • customer.subscription.created                  ║"
echo "    ║    • customer.subscription.updated                  ║"
echo "    ║    • customer.subscription.deleted                  ║"
echo "    ║    • invoice.payment_succeeded                      ║"
echo "    ║                                                      ║"
echo "    ║  Copy the webhook secret → run this script again    ║"
echo "    ║  with STRIPE_WEBHOOK_SECRET=whsec_... added to     ║"
echo "    ║  the secrets set command above.                     ║"
echo "    ╚══════════════════════════════════════════════════════╝"
