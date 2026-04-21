// ─────────────────────────────────────────────
// Trainly — Map Store
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { MapFilters, SessionCategory, SessionType } from '@trainly/shared';

interface MapState {
  userLocation: { latitude: number; longitude: number } | null;
  selectedSessionId: string | null;
  filters: MapFilters;
  isFilterSheetOpen: boolean;

  setUserLocation: (coords: { latitude: number; longitude: number }) => void;
  setSelectedSessionId: (id: string | null) => void;
  setFilters: (filters: Partial<MapFilters>) => void;
  resetFilters: () => void;
  setFilterSheetOpen: (open: boolean) => void;
}

const DEFAULT_FILTERS: MapFilters = {
  radius_km: 10,
};

export const useMapStore = create<MapState>((set) => ({
  userLocation: null,
  selectedSessionId: null,
  filters: DEFAULT_FILTERS,
  isFilterSheetOpen: false,

  setUserLocation: (coords) => set({ userLocation: coords }),

  setSelectedSessionId: (id) => set({ selectedSessionId: id }),

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setFilterSheetOpen: (open) => set({ isFilterSheetOpen: open }),
}));
