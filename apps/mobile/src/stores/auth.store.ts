// ─────────────────────────────────────────────
// Trainly — Auth Store
// ─────────────────────────────────────────────

import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { UserRole } from '@trainly/shared';
import { supabase } from '@lib/supabase';

interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  total_xp: number;
  current_level: number;
  user_plus_expires_at: string | null;
  group_creation_expires_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarded: boolean;
  preferred_language: 'pt' | 'en';
  is_suspended: boolean;
  is_featured: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  // Dev mode role override
  devRoleOverride: UserRole | null;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setDevRoleOverride: (role: UserRole | null) => void;

  // Computed helpers
  effectiveRole: () => UserRole;
  isTrainer: () => boolean;
  isCoachPro: () => boolean;
  isAdmin: () => boolean;
  canCreateGroups: () => boolean;
  hasUserPlus: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  devRoleOverride: null,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isInitialized: true,
    });
  },

  setProfile: (profile) => set({ profile }),

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) set({ profile: data as Profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      devRoleOverride: null,
    });
  },

  setDevRoleOverride: (role) => set({ devRoleOverride: role }),

  effectiveRole: () => {
    const { profile, devRoleOverride } = get();
    if (devRoleOverride && __DEV__) return devRoleOverride;
    return profile?.role ?? 'user_free';
  },

  isTrainer: () => {
    const role = get().effectiveRole();
    return role === 'trainer' || role === 'coach_pro' || role === 'admin';
  },

  isCoachPro: () => {
    const role = get().effectiveRole();
    return role === 'coach_pro' || role === 'admin';
  },

  isAdmin: () => get().effectiveRole() === 'admin',

  canCreateGroups: () => {
    const { profile, devRoleOverride } = get();
    if (devRoleOverride === 'user_plus' && __DEV__) return true;
    if (!profile?.group_creation_expires_at) return false;
    return new Date(profile.group_creation_expires_at) > new Date();
  },

  hasUserPlus: () => {
    const { profile, devRoleOverride } = get();
    if (devRoleOverride === 'user_plus' && __DEV__) return true;
    if (!profile?.user_plus_expires_at) return false;
    return new Date(profile.user_plus_expires_at) > new Date();
  },
}));
