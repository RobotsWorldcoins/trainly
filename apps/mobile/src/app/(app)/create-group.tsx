import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

const CATEGORIES = ['yoga', 'running', 'hiit', 'cycling', 'strength', 'pilates', 'crossfit', 'martial_arts', 'swimming', 'stretching', 'bootcamp', 'other'];
const INTENSITIES = ['low', 'moderate', 'high', 'extreme'];
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'all_levels'];

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const { user, profile, canCreateGroups } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [notes, setNotes] = useState('');

  // Guard: must have group creation access
  if (!canCreateGroups()) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Criar Grupo</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.gateContainer}>
          <Text style={styles.gateEmoji}>🔒</Text>
          <Text style={styles.gateTitle}>Funcionalidade User Plus</Text>
          <Text style={styles.gateText}>
            Para criar grupos de atividade social, precisas de subscrever o plano User Plus por €4,99.
          </Text>
          <Pressable style={styles.upgradeBtn} onPress={() => router.push('/(app)/plans')}>
            <Text style={styles.upgradeBtnText}>Ver planos</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const validate = () => {
    if (!title.trim()) return 'Título é obrigatório.';
    if (!category) return 'Seleciona uma categoria.';
    if (!intensity) return 'Seleciona a intensidade.';
    if (!skillLevel) return 'Seleciona o nível.';
    if (endTime <= startTime) return 'A hora de fim deve ser depois do início.';
    if (!locationName.trim()) return 'Nome do local é obrigatório.';
    if (!locationLat || !locationLng) return 'Coordenadas do local são obrigatórias.';
    const max = parseInt(maxParticipants);
    if (isNaN(max) || max < 2) return 'Mínimo 2 participantes.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('', err); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('sessions').insert({
        trainer_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        type: 'social_group',
        intensity,
        skill_level: skillLevel,
        body_areas: [],
        senior_friendly: false,
        date: format(date, 'yyyy-MM-dd'),
        start_time: format(startTime, 'HH:mm:ss'),
        end_time: format(endTime, 'HH:mm:ss'),
        location_name: locationName.trim(),
        location_lat: parseFloat(locationLat),
        location_lng: parseFloat(locationLng),
        min_participants: 2,
        max_participants: parseInt(maxParticipants),
        price: 0,
        currency: 'eur',
        notes: notes.trim() || null,
        status: 'published',
      });

      if (error) throw error;

      Alert.alert('Grupo criado!', 'O teu grupo está agora visível no mapa.', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/sessions') },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível criar o grupo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Criar Grupo Social</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            🌿 Grupos sociais são gratuitos. Qualquer utilizador pode juntar-se.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do grupo</Text>

          <Text style={styles.label}>Título *</Text>
          <TextInput style={styles.input} placeholder="ex: Corrida matinal no Tejo" value={title} onChangeText={setTitle} maxLength={80} />

          <Text style={styles.label}>Descrição</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Descreve o grupo..." value={description} onChangeText={setDescription} multiline numberOfLines={4} maxLength={500} />

          <Text style={styles.label}>Categoria *</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map(c => (
              <Pressable key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{t(`categories.${c}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Intensidade *</Text>
          <View style={styles.chipRow}>
            {INTENSITIES.map(i => (
              <Pressable key={i} style={[styles.chip, intensity === i && styles.chipActive]} onPress={() => setIntensity(i)}>
                <Text style={[styles.chipText, intensity === i && styles.chipTextActive]}>{t(`intensity.${i}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Nível *</Text>
          <View style={styles.chipRow}>
            {SKILL_LEVELS.map(s => (
              <Pressable key={s} style={[styles.chip, skillLevel === s && styles.chipActive]} onPress={() => setSkillLevel(s)}>
                <Text style={[styles.chipText, skillLevel === s && styles.chipTextActive]}>{t(`skill.${s}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e hora</Text>

          <Text style={styles.label}>Data *</Text>
          <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateBtnText}>{format(date, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}</Text>
            <Text>📅</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker value={date} mode="date" minimumDate={new Date()} onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
          )}

          <Text style={styles.label}>Hora de início *</Text>
          <Pressable style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.dateBtnText}>{format(startTime, 'HH:mm')}</Text>
            <Text>🕐</Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker value={startTime} mode="time" is24Hour onChange={(_, d) => { setShowStartPicker(false); if (d) setStartTime(d); }} />
          )}

          <Text style={styles.label}>Hora de fim *</Text>
          <Pressable style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
            <Text style={styles.dateBtnText}>{format(endTime, 'HH:mm')}</Text>
            <Text>🕐</Text>
          </Pressable>
          {showEndPicker && (
            <DateTimePicker value={endTime} mode="time" is24Hour onChange={(_, d) => { setShowEndPicker(false); if (d) setEndTime(d); }} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local</Text>

          <Text style={styles.label}>Nome do local *</Text>
          <TextInput style={styles.input} placeholder="ex: Ribeira das Naus" value={locationName} onChangeText={setLocationName} />

          <Text style={styles.label}>Latitude *</Text>
          <TextInput style={styles.input} placeholder="ex: 38.7063" value={locationLat} onChangeText={setLocationLat} keyboardType="decimal-pad" />

          <Text style={styles.label}>Longitude *</Text>
          <TextInput style={styles.input} placeholder="ex: -9.1365" value={locationLng} onChangeText={setLocationLng} keyboardType="decimal-pad" />

          <Text style={styles.label}>Máx. participantes</Text>
          <TextInput style={styles.input} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />

          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="ex: Ponto de encontro junto à fonte, trazer garrafa de água..."
            value={notes}
            onChangeText={setNotes}
            multiline numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.submitBtnText}>Criar grupo 🌿</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[8], gap: Spacing[4] },
  gateEmoji: { fontSize: 56 },
  gateTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.bold, color: Colors.text, textAlign: 'center' },
  gateText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.base * 1.6 },
  upgradeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing[4], paddingHorizontal: Spacing[8] },
  upgradeBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  infoBanner: { backgroundColor: '#ECFDF5', borderRadius: BorderRadius.md, padding: Spacing[3], marginBottom: Spacing[2] },
  infoBannerText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: '#065F46' },
  scroll: { padding: Spacing[5], paddingBottom: 120, gap: Spacing[6] },
  section: { gap: Spacing[4] },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text, marginBottom: -8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
  },
  dateBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: 34,
  },
  submitBtn: { backgroundColor: Colors.success, borderRadius: BorderRadius.lg, paddingVertical: Spacing[4], alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
