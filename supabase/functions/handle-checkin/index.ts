// ─────────────────────────────────────────────────────────────────────────────
// Trainly — Check-in Validation Edge Function
// Validates GPS proximity + timing for session attendance
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHECKIN_MAX_DISTANCE_METERS = 200;
const CHECKIN_WINDOW_MINUTES_BEFORE = 15;
const CHECKIN_WINDOW_MINUTES_AFTER = 30;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response('Unauthorized', { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const { session_id, lat, lng, action = 'checkin' } = body;

  if (!session_id || lat == null || lng == null) {
    return new Response('Missing required fields', { status: 400 });
  }

  try {
    const result = action === 'checkin'
      ? await handleCheckin(user.id, session_id, lat, lng)
      : await handleCheckout(user.id, session_id, lat, lng);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckin(userId: string, sessionId: string, lat: number, lng: number) {
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');
  if (session.status !== 'published' && session.status !== 'in_progress') {
    throw new Error('Session is not active');
  }

  // Verify user is a confirmed participant
  const { data: participant } = await supabase
    .from('session_participants')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!participant || participant.status !== 'confirmed') {
    throw new Error('User is not a confirmed participant');
  }

  // Check timing window
  const sessionStart = new Date(`${session.date}T${session.start_time}`);
  const now = new Date();
  const diffMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);

  const isTimeValid =
    diffMinutes >= -CHECKIN_WINDOW_MINUTES_BEFORE &&
    diffMinutes <= CHECKIN_WINDOW_MINUTES_AFTER;

  // Calculate distance
  const distanceMeters = haversineDistance(
    lat, lng,
    session.location_lat, session.location_lng
  );
  const isLocationValid = distanceMeters <= CHECKIN_MAX_DISTANCE_METERS;

  // Insert or update checkin
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    throw new Error('Already checked in');
  }

  const { data: checkin, error } = await supabase
    .from('checkins')
    .insert({
      session_id: sessionId,
      user_id: userId,
      participant_id: participant.id,
      status: 'checked_in',
      checkin_at: now.toISOString(),
      checkin_lat: lat,
      checkin_lng: lng,
      checkin_distance_m: distanceMeters,
      is_location_valid: isLocationValid,
      is_time_valid: isTimeValid,
      is_validated: isTimeValid && isLocationValid,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-validate if both checks pass
  if (isTimeValid && isLocationValid) {
    await supabase
      .from('checkins')
      .update({ status: 'validated', validated_at: now.toISOString() })
      .eq('id', checkin.id);
  }

  // Update session to in_progress if first check-in
  await supabase
    .from('sessions')
    .update({ status: 'in_progress' })
    .eq('id', sessionId)
    .eq('status', 'published');

  return {
    success: true,
    is_validated: isTimeValid && isLocationValid,
    is_location_valid: isLocationValid,
    is_time_valid: isTimeValid,
    distance_meters: Math.round(distanceMeters),
    message: isTimeValid && isLocationValid
      ? 'Check-in validado com sucesso!'
      : !isLocationValid
        ? `Estás a ${Math.round(distanceMeters)}m do local. Máximo permitido: ${CHECKIN_MAX_DISTANCE_METERS}m`
        : 'Check-in fora da janela de tempo',
  };
}

async function handleCheckout(userId: string, sessionId: string, lat: number, lng: number) {
  const { data: checkin } = await supabase
    .from('checkins')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!checkin) throw new Error('No check-in found');
  if (checkin.checkout_at) throw new Error('Already checked out');

  const now = new Date();

  await supabase
    .from('checkins')
    .update({
      checkout_at: now.toISOString(),
      checkout_lat: lat,
      checkout_lng: lng,
      status: checkin.is_validated ? 'validated' : 'checked_out',
    })
    .eq('id', checkin.id);

  return {
    success: true,
    message: 'Check-out registado com sucesso!',
  };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
