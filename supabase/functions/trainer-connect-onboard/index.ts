import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, role, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: corsHeaders });
    }

    if (!['trainer', 'coach_pro', 'admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Only trainers can connect Stripe' }), { status: 403, headers: corsHeaders });
    }

    let accountId = profile.stripe_connect_account_id;

    // Create Express account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'PT',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Personal training and fitness sessions',
          mcc: '7941', // Athletic fields, golf courses, sporting events
        },
        metadata: {
          supabase_user_id: user.id,
          display_name: profile.display_name,
        },
      });

      accountId = account.id;

      await supabase.from('profiles').update({
        stripe_connect_account_id: accountId,
      }).eq('user_id', user.id);
    }

    // Check onboarding status
    const account = await stripe.accounts.retrieve(accountId);
    const isOnboarded = account.charges_enabled && account.payouts_enabled;

    if (isOnboarded && !profile.stripe_connect_onboarded) {
      await supabase.from('profiles').update({ stripe_connect_onboarded: true }).eq('user_id', user.id);
      return new Response(
        JSON.stringify({ success: true, onboarded: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate onboarding link
    const appScheme = Deno.env.get('APP_SCHEME') || 'trainly';
    const onboardingLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appScheme}://trainer/stripe-onboard?refresh=true`,
      return_url: `${appScheme}://trainer/stripe-onboard?success=true`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: onboardingLink.url, accountId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('trainer-connect-onboard error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
