#!/usr/bin/env bash
# ============================================================
# TrainyX – Create 6 Stripe prices + set Supabase secrets
# ============================================================
# Usage:
#   1. Replace SK_LIVE below with your real Stripe secret key
#      (Stripe Dashboard → Developers → API Keys → Secret key)
#   2. Run:  bash scripts/create-stripe-prices.sh
# ============================================================

set -euo pipefail

# ─── FILL THIS IN ──────────────────────────────────────────
STRIPE_SECRET_KEY="sk_live_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY"
SUPABASE_ACCESS_TOKEN="sbp_d917e694e1b38016c2731108d7cbe90dbf7fb70e"
SUPABASE_PROJECT_REF="mrxnwdvsfalwlpbhmsap"
# ───────────────────────────────────────────────────────────

if [[ "$STRIPE_SECRET_KEY" == sk_live_REPLACE* ]]; then
  echo "❌  Please edit this script and set STRIPE_SECRET_KEY to your real sk_live_... key."
  exit 1
fi

echo "🔧  Creating 6 Stripe prices…"

create_price() {
  local nickname="$1"
  local amount="$2"   # in cents
  local interval="$3" # month | year
  curl -s https://api.stripe.com/v1/prices \
    -u "${STRIPE_SECRET_KEY}:" \
    -d "currency=eur" \
    -d "unit_amount=${amount}" \
    -d "recurring[interval]=${interval}" \
    -d "product_data[name]=${nickname}" \
    -d "nickname=${nickname}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','ERROR: '+str(d)))"
}

P_USER_PLUS_MONTHLY=$(create_price  "TrainyX User Plus – Mensal"    499   month)
P_USER_PLUS_ANNUAL=$(create_price   "TrainyX User Plus – Anual"     3999  year)
P_TRAINER_MONTHLY=$(create_price    "TrainyX Trainer – Mensal"      1900  month)
P_TRAINER_ANNUAL=$(create_price     "TrainyX Trainer – Anual"       15900 year)
P_COACH_PRO_MONTHLY=$(create_price  "TrainyX Coach Pro – Mensal"    3900  month)
P_COACH_PRO_ANNUAL=$(create_price   "TrainyX Coach Pro – Anual"     31900 year)

echo ""
echo "✅  Prices created:"
echo "   USER_PLUS_MONTHLY  → $P_USER_PLUS_MONTHLY"
echo "   USER_PLUS_ANNUAL   → $P_USER_PLUS_ANNUAL"
echo "   TRAINER_MONTHLY    → $P_TRAINER_MONTHLY"
echo "   TRAINER_ANNUAL     → $P_TRAINER_ANNUAL"
echo "   COACH_PRO_MONTHLY  → $P_COACH_PRO_MONTHLY"
echo "   COACH_PRO_ANNUAL   → $P_COACH_PRO_ANNUAL"

# Check for errors
for v in "$P_USER_PLUS_MONTHLY" "$P_USER_PLUS_ANNUAL" "$P_TRAINER_MONTHLY" "$P_TRAINER_ANNUAL" "$P_COACH_PRO_MONTHLY" "$P_COACH_PRO_ANNUAL"; do
  if [[ "$v" != price_* ]]; then
    echo "❌  One or more prices failed. Aborting secrets upload."
    exit 1
  fi
done

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
echo "🚀  All done! Deploying edge function…"

SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase@latest functions deploy create-subscription \
  --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "🎉  TrainyX billing is live!"
echo "    Next: add your Stripe webhook → https://mrxnwdvsfalwlpbhmsap.functions.supabase.co/stripe-webhook"
