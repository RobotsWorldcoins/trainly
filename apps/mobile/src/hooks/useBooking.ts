import { useState, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@lib/supabase';
import { initiateBookingPayment } from '@lib/stripe';
import { useAuthStore } from '@stores/auth.store';

export function useBooking(sessionId: string) {
  const { user, profile } = useAuthStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const bookSession = useCallback(async (session: {
    price: number;
    currency: string;
    title: string;
    trainer_name: string;
  }) => {
    if (!user || !profile) throw new Error('Not authenticated');

    setIsProcessing(true);
    try {
      // 1. Create participant record (hold spot)
      const { data: participant, error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          profile_id: profile.id,
          status: 'confirmed',
        })
        .select()
        .single();

      if (participantError) {
        if (participantError.code === '23505') throw new Error('Já reservaste esta sessão.');
        throw participantError;
      }

      const amountCents = Math.round(session.price * 100);

      // Free sessions skip payment
      if (amountCents === 0) {
        await supabase.from('xp_logs').insert({
          user_id: user.id,
          amount: 50,
          source: 'session_booked_free',
          reference_id: sessionId,
          reference_type: 'session',
        });
        return { success: true, participantId: participant.id, free: true };
      }

      // 2. Create payment intent via edge function
      const { clientSecret, paymentIntentId } = await initiateBookingPayment({
        sessionId,
        participantId: participant.id,
        amountCents,
        currency: session.currency,
        trainerName: session.trainer_name,
        sessionTitle: session.title,
      });

      // 3. Init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Trainly',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: profile.display_name,
        },
        appearance: {
          colors: {
            primary: '#1B6FEB',
          },
        },
      });

      if (initError) throw new Error(initError.message);

      // 4. Present payment sheet to user
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        // Clean up participant record on cancellation
        if (paymentError.code === 'Canceled') {
          await supabase.from('session_participants').delete().eq('id', participant.id);
          return { success: false, cancelled: true };
        }
        await supabase.from('session_participants').delete().eq('id', participant.id);
        throw new Error(paymentError.message);
      }

      // 5. Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['user-booking', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['my-sessions'] });

      return { success: true, participantId: participant.id, paymentIntentId };
    } finally {
      setIsProcessing(false);
    }
  }, [user, profile, sessionId, initPaymentSheet, presentPaymentSheet, queryClient]);

  return { bookSession, isProcessing };
}
