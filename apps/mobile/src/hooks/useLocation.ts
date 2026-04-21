import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useMapStore } from '@stores/map.store';

interface LocationState {
  coords: { latitude: number; longitude: number } | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useLocation(autoRequest = false) {
  const { setUserLocation } = useMapStore();
  const [state, setState] = useState<LocationState>({
    coords: null,
    hasPermission: false,
    isLoading: false,
    error: null,
  });

  const requestPermission = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState(s => ({ ...s, hasPermission: false, isLoading: false, error: 'permission_denied' }));
        return false;
      }
      setState(s => ({ ...s, hasPermission: true }));
      return true;
    } catch {
      setState(s => ({ ...s, isLoading: false, error: 'request_failed' }));
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setState(s => ({ ...s, coords, hasPermission: true, isLoading: false }));
      setUserLocation(coords);
      return coords;
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
      return null;
    }
  }, [requestPermission, setUserLocation]);

  // Distance calculation utility
  const distanceTo = useCallback((targetLat: number, targetLng: number): number | null => {
    if (!state.coords) return null;
    const R = 6371000;
    const dLat = (targetLat - state.coords.latitude) * Math.PI / 180;
    const dLng = (targetLng - state.coords.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(state.coords.latitude * Math.PI / 180) *
      Math.cos(targetLat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [state.coords]);

  useEffect(() => {
    if (autoRequest) {
      getCurrentLocation();
    } else {
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') getCurrentLocation();
        else setState(s => ({ ...s, hasPermission: false }));
      });
    }
  }, [autoRequest]);

  return { ...state, requestPermission, getCurrentLocation, distanceTo };
}
