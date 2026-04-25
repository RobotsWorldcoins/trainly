// ─────────────────────────────────────────────
// TrainyX — Stripe helpers for React Native
// ─────────────────────────────────────────────

import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

export interface BookingPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Create a payment intent via Supabase Edge Function and confirm it
 * using Stripe's native payment sheet.
 */
export async function initiateBookingPayment(params: {
  sessionId: string;
  participantId: string;
  amountCents: number;
  currency: string;
  trainerName: string;
  sessionTitle: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Payment failed');
  }

  return response.json();
}

/**
 * Cancel a booking and trigger the refund logic.
 */
export async function cancelBooking(params: {
  participantId: string;
  sessionId: string;
  reason?: string;
}): Promise<{ refundAmount: number; refundPercent: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel-booking`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Cancellation failed');
  }

  return response.json();
}

/**
 * Start Stripe Connect onboarding for a trainer.
 * Returns a URL to redirect the trainer to.
 */
export async function startTrainerConnectOnboarding(): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/trainer-connect-onboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Onboarding failed');
  }

  return response.json();
}

// Format cents to display string: 1500 → "€15,00"
export function formatCents(cents: number, currency = 'eur'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// Calculate platform fee
export function calculateFee(amountCents: number, rate = 0.10): {
  total: number;
  platformFee: number;
  trainerAmount: number;
} {
  const platformFee = Math.round(amountCents * rate);
  return {
    total: amountCents,
    platformFee,
    trainerAmount: amountCents - platformFee,
  };
}
