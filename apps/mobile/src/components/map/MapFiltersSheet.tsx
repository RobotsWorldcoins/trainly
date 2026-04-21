import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';
import { useMapStore } from '@stores/map.store';
import { SESSION_CATEGORIES } from '@trainly/shared';

interface MapFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
}

const RADIUS_OPTIONS = [5, 10, 20, 30] as const;

export function MapFiltersSheet({ visible, onClose }: MapFiltersSheetProps) {
  const { t } = useTranslation();
  const { filters, setFilters, resetFilters } = useMapStore();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('map.filters')}</Text>
          <Pressable onPress={resetFilters}>
            <Text style={styles.reset}>{t('common.clear')}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Radius */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('map.radius')}</Text>
            <View style={styles.chips}>
              {RADIUS_OPTIONS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, filters.radius_km === r && styles.chipActive]}
                  onPress={() => setFilters({ radius_km: r })}
                >
                  <Text style={[styles.chipText, filters.radius_km === r && styles.chipTextActive]}>
                    {r} km
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Session Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('map.type')}</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, filters.session_type === undefined && styles.chipActive]}
                onPress={() => setFilters({ session_type: undefined })}
              >
                <Text style={[styles.chipText, filters.session_type === undefined && styles.chipTextActive]}>
                  Todos
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, filters.session_type === 'trainer_led' && styles.chipActive]}
                onPress={() => setFilters({ session_type: 'trainer_led' })}
              >
                <Text style={[styles.chipText, filters.session_type === 'trainer_led' && styles.chipTextActive]}>
                  🏋️ {t('map.trainer_led')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, filters.session_type === 'social_group' && styles.chipActive]}
                onPress={() => setFilters({ session_type: 'social_group' })}
              >
                <Text style={[styles.chipText, filters.session_type === 'social_group' && styles.chipTextActive]}>
                  👥 {t('map.social_group')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('map.category')}</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, !filters.category && styles.chipActive]}
                onPress={() => setFilters({ category: undefined })}
              >
                <Text style={[styles.chipText, !filters.category && styles.chipTextActive]}>
                  Todas
                </Text>
              </Pressable>
              {SESSION_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[styles.chip, filters.category === cat.key && styles.chipActive]}
                  onPress={() => setFilters({ category: cat.key as any })}
                >
                  <Text style={[styles.chipText, filters.category === cat.key && styles.chipTextActive]}>
                    {cat.label_pt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Senior Friendly */}
          <View style={styles.section}>
            <Pressable
              style={[styles.toggle, filters.is_senior_friendly && styles.toggleActive]}
              onPress={() => setFilters({ is_senior_friendly: !filters.is_senior_friendly || undefined })}
            >
              <Text style={styles.toggleEmoji}>💙</Text>
              <Text style={[styles.toggleText, filters.is_senior_friendly && styles.toggleTextActive]}>
                {t('map.senior_friendly')}
              </Text>
              <View style={[styles.toggleCheck, filters.is_senior_friendly && styles.toggleCheckActive]}>
                {filters.is_senior_friendly && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>
          </View>

          <View style={{ height: Spacing[8] }} />
        </ScrollView>

        {/* Apply */}
        <Pressable style={styles.applyButton} onPress={onClose}>
          <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing[5],
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginVertical: Spacing[3],
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing[4],
  },
  title: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  reset: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  section: { marginBottom: Spacing[5] },
  sectionLabel: {
    fontSize: FontSize.sm, fontFamily: FontFamily.semibold,
    color: Colors.textSecondary, marginBottom: Spacing[3], textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    padding: Spacing[4], borderWidth: 1.5, borderColor: Colors.border,
  },
  toggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryAlpha10 },
  toggleEmoji: { fontSize: 20 },
  toggleText: { flex: 1, fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.text },
  toggleTextActive: { color: Colors.primary },
  toggleCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  toggleCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { fontSize: 12, color: Colors.textInverse, fontFamily: FontFamily.bold },
  applyButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center', marginTop: Spacing[4],
  },
  applyButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
