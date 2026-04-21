import { useState, useCallback } from 'react';
import { supabase } from '@lib/supabase';
import { useLocation } from './useLocation';

interface CheckinResult {
  success: boolean;
  is_validated: boolean;
  is_location_valid: boolean;
  is_time_valid: boolean;
  distance_meters: number;
  message: string;
}

export function useCheckin(sessionId: string) {
  const { getCurrentLocation } = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performCheckin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      if (!coords) throw new Error('Não foi possível obter a localização.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/handle-checkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            lat: coords.latitude,
            lng: coords.longitude,
            action: 'checkin',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Check-in falhou');

      setResult(data);
      return data as CheckinResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getCurrentLocation]);

  const performCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      if (!coords) throw new Error('Não foi possível obter a localização.');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/handle-checkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            lat: coords.latitude,
            lng: coords.longitude,
            action: 'checkout',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Check-out falhou');

      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getCurrentLocation]);

  return { performCheckin, performCheckout, isLoading, result, error };
}
