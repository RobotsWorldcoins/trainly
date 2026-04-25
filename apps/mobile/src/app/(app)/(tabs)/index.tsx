import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, CategoryColors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { LISBON_COORDS, DEFAULT_RADIUS_KM } from '@trainyx/shared';
import { useMapStore } from '@stores/map.store';
import { supabase } from '@lib/supabase';
import { SessionCard } from '@components/sessions/SessionCard';
import { MapFiltersSheet } from '@components/map/MapFiltersSheet';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN!);

const { height } = Dimensions.get('window');

interface SessionMapItem {
  id: string;
  title: string;
  category: string;
  type: string;
  price: number;
  location_lat: number;
  location_lng: number;
  location_name: string;
  date: string;
  start_time: string;
  current_participants: number;
  max_participants: number;
  is_boosted: boolean;
  trainer: {
    display_name: string;
    avatar_url: string | null;
  };
}

async function fetchNearbySessions(
  lat: number,
  lng: number,
  radius_km: number,
  filters: Record<string, any>
) {
  let query = supabase
    .from('sessions')
    .select(`
      id, title, category, type, price, location_lat, location_lng,
      location_name, date, start_time, current_participants, max_participants,
      is_boosted,
      trainer:profiles!trainer_id(display_name, avatar_url)
    `)
    .eq('status', 'published')
    .gte('date', new Date().toISOString().split('T')[0]);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.session_type) query = query.eq('type', filters.session_type);
  if (filters.intensity) query = query.eq('intensity', filters.intensity);
  if (filters.is_senior_friendly) query = query.eq('is_senior_friendly', true);

  const { data, error } = await query.limit(50);
  if (error) throw error;

  // Client-side distance filter (PostGIS function preferred in production)
  return (data || []).filter((s) => {
    const R = 6371;
    const dLat = ((s.location_lat - lat) * Math.PI) / 180;
    const dLng = ((s.location_lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((s.location_lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= radius_km;
  }) as SessionMapItem[];
}

export default function MapScreen() {
  const { t } = useTranslation();
  const { userLocation, setUserLocation, filters, selectedSessionId, setSelectedSessionId, isFilterSheetOpen, setFilterSheetOpen } = useMapStore();
  const [mapReady, setMapReady] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['25%', '55%', '85%'];

  const effectiveLocation = userLocation ?? LISBON_COORDS;

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['nearby-sessions', effectiveLocation.latitude, effectiveLocation.longitude, filters],
    queryFn: () => fetchNearbySessions(
      effectiveLocation.latitude,
      effectiveLocation.longitude,
      filters.radius_km,
      filters
    ),
    enabled: mapReady,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const handleMarkerPress = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        onDidFinishLoadingMap={() => setMapReady(true)}
        attributionEnabled={false}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          centerCoordinate={[effectiveLocation.longitude, effectiveLocation.latitude]}
          zoomLevel={12}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User location */}
        <MapboxGL.UserLocation visible animated />

        {/* Session markers */}
        {sessions.map((session) => (
          <MapboxGL.MarkerView
            key={session.id}
            coordinate={[session.location_lng, session.location_lat]}
          >
            <Pressable
              onPress={() => handleMarkerPress(session.id)}
              style={[
                styles.marker,
                session.type === 'trainer_led' ? styles.markerTrainer : styles.markerSocial,
                session.is_boosted && styles.markerBoosted,
                selectedSessionId === session.id && styles.markerSelected,
              ]}
            >
              <Text style={styles.markerEmoji}>
                {session.type === 'trainer_led' ? '🏋️' : '👥'}
              </Text>
              {session.price > 0 && (
                <Text style={styles.markerPrice}>€{session.price}</Text>
              )}
            </Pressable>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Top search bar */}
      <SafeAreaView style={styles.topOverlay} edges={['top']}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Pressable style={styles.searchInput} onPress={() => setFilterSheetOpen(true)}>
            <Text style={styles.searchPlaceholder}>
              {t('map.search_placeholder')}
            </Text>
          </Pressable>
          <Pressable style={styles.filterButton} onPress={() => setFilterSheetOpen(true)}>
            <Text style={styles.filterIcon}>⚡</Text>
          </Pressable>
        </View>

        {/* Active filter chips */}
        <View style={styles.filterChips}>
          <Pressable
            style={[styles.chip, styles.chipRadius]}
            onPress={() => setFilterSheetOpen(true)}
          >
            <Text style={styles.chipText}>{filters.radius_km} km</Text>
          </Pressable>
          {filters.category && (
            <Pressable style={styles.chip}>
              <Text style={styles.chipText}>{t(`categories.${filters.category}`)}</Text>
            </Pressable>
          )}
          {filters.session_type && (
            <Pressable style={styles.chip}>
              <Text style={styles.chipText}>
                {filters.session_type === 'trainer_led' ? t('map.trainer_led') : t('map.social_group')}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Results count badge */}
      {!isLoading && (
        <View style={styles.resultsBadge}>
          <Text style={styles.resultsBadgeText}>
            {sessions.length} sessões
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheet}
        handleIndicatorStyle={styles.handle}
        enablePanDownToClose={false}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedSession ? (
            <>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Sessão Selecionada</Text>
                <Pressable onPress={() => setSelectedSessionId(null)}>
                  <Text style={styles.clearSelection}>✕</Text>
                </Pressable>
              </View>
              <SessionCard
                session={selectedSession as any}
                onPress={() => router.push(`/(app)/session/${selectedSession.id}`)}
              />
            </>
          ) : (
            <>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>
                  {sessions.length > 0 ? `${sessions.length} sessões perto de ti` : t('map.no_sessions')}
                </Text>
              </View>
              {sessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🗺️</Text>
                  <Text style={styles.emptyText}>{t('map.no_sessions_sub')}</Text>
                </View>
              ) : (
                sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session as any}
                    onPress={() => router.push(`/(app)/session/${session.id}`)}
                  />
                ))
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Filter sheet */}
      <MapFiltersSheet
        visible={isFilterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    marginBottom: Spacing[2],
    ...Shadow.md,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing[2] },
  searchInput: { flex: 1 },
  searchPlaceholder: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textMuted,
  },
  filterButton: {
    backgroundColor: Colors.primaryAlpha10,
    borderRadius: BorderRadius.md,
    padding: Spacing[2],
  },
  filterIcon: { fontSize: 16 },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    ...Shadow.sm,
  },
  chipRadius: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.text,
  },
  marker: {
    borderRadius: BorderRadius.full,
    padding: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
    backgroundColor: Colors.surface,
    ...Shadow.md,
    flexDirection: 'row',
    gap: 4,
  },
  markerTrainer: { backgroundColor: Colors.primary },
  markerSocial: { backgroundColor: Colors.success },
  markerBoosted: { backgroundColor: Colors.accent, borderColor: Colors.accentDark },
  markerSelected: { transform: [{ scale: 1.2 }] },
  markerEmoji: { fontSize: 16 },
  markerPrice: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.textInverse,
  },
  resultsBadge: {
    position: 'absolute',
    bottom: height * 0.25 + 12,
    alignSelf: 'center',
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    opacity: 0.9,
  },
  resultsBadgeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textInverse,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: height * 0.25 + 12,
    alignSelf: 'center',
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: Colors.border,
    width: 36,
  },
  bottomSheetContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: 32,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  bottomSheetTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    color: Colors.text,
  },
  clearSelection: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    padding: Spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing[10],
    gap: Spacing[3],
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
