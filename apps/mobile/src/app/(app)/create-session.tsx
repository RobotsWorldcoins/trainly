import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Switch, ActivityIndicator, Alert, Platform,
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
const BODY_AREAS = ['full_body', 'upper_body', 'lower_body', 'core', 'cardio', 'flexibility'];

export default function CreateSessionScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [intensity, setIntensity] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<string[]>([]);
  const [seniorFriendly, setSeniorFriendly] = useState(false);

  // Step 2: Schedule
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

  // Step 3: Location & capacity
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [minParticipants, setMinParticipants] = useState('2');
  const [maxParticipants, setMaxParticipants] = useState('10');

  // Step 4: Pricing
  const [price, setPrice] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [notes, setNotes] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  const toggleBodyArea = (area: string) => {
    setSelectedBodyAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const validateStep = () => {
    if (step === 1) {
      if (!title.trim()) return 'Título é obrigatório.';
      if (!category) return 'Seleciona uma categoria.';
      if (!intensity) return 'Seleciona a intensidade.';
      if (!skillLevel) return 'Seleciona o nível.';
    }
    if (step === 2) {
      if (endTime <= startTime) return 'A hora de fim deve ser depois da hora de início.';
    }
    if (step === 3) {
      if (!locationName.trim()) return 'Nome do local é obrigatório.';
      if (!locationLat || !locationLng) return 'Coordenadas do local são obrigatórias.';
      const min = parseInt(minParticipants);
      const max = parseInt(maxParticipants);
      if (isNaN(min) || min < 1) return 'Mínimo de participantes inválido.';
      if (isNaN(max) || max < min) return 'Máximo deve ser ≥ mínimo.';
    }
    if (step === 4) {
      const p = parseFloat(price);
      if (price !== '' && (isNaN(p) || p < 0)) return 'Preço inválido.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { Alert.alert('', err); return; }
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const parsedPrice = price === '' ? 0 : parseFloat(price);
      const dateStr = format(date, 'yyyy-MM-dd');
      const startStr = format(startTime, 'HH:mm:ss');
      const endStr = format(endTime, 'HH:mm:ss');

      const { data, error } = await supabase.from('sessions').insert({
        trainer_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        type: 'trainer_led',
        intensity,
        skill_level: skillLevel,
        body_areas: selectedBodyAreas,
        senior_friendly: seniorFriendly,
        date: dateStr,
        start_time: startStr,
        end_time: endStr,
        location_name: locationName.trim(),
        location_lat: parseFloat(locationLat),
        location_lng: parseFloat(locationLng),
        min_participants: parseInt(minParticipants),
        max_participants: parseInt(maxParticipants),
        price: parsedPrice,
        currency: 'eur',
        cancellation_policy: cancellationPolicy.trim() || null,
        notes: notes.trim() || null,
        status: isDraft ? 'draft' : 'published',
      }).select().single();

      if (error) throw error;

      Alert.alert(
        isDraft ? 'Rascunho guardado' : 'Sessão publicada!',
        isDraft ? 'A tua sessão foi guardada como rascunho.' : 'A tua sessão está agora disponível.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/trainer/sessions') }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível criar a sessão.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    t('create_session.step_info'),
    t('create_session.step_schedule'),
    t('create_session.step_location'),
    t('create_session.step_pricing'),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('create_session.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {steps.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, i + 1 === step && styles.stepDotActive, i + 1 < step && styles.stepDotDone]}>
              <Text style={[styles.stepDotText, (i + 1 <= step) && styles.stepDotTextActive]}>
                {i + 1 < step ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i + 1 === step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informação básica</Text>

            <Text style={styles.label}>Título *</Text>
            <TextInput style={styles.input} placeholder="ex: Treino HIIT no Parque" value={title} onChangeText={setTitle} maxLength={80} />

            <Text style={styles.label}>Descrição</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Descreve a tua sessão..." value={description} onChangeText={setDescription} multiline numberOfLines={4} maxLength={500} />

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

            <Text style={styles.label}>Áreas do corpo</Text>
            <View style={styles.chipGrid}>
              {BODY_AREAS.map(a => (
                <Pressable key={a} style={[styles.chip, selectedBodyAreas.includes(a) && styles.chipActive]} onPress={() => toggleBodyArea(a)}>
                  <Text style={[styles.chipText, selectedBodyAreas.includes(a) && styles.chipTextActive]}>{t(`body_area.${a}`)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.label}>Adequado para seniores</Text>
                <Text style={styles.hint}>Sessão adaptada para participantes mais velhos</Text>
              </View>
              <Switch value={seniorFriendly} onValueChange={setSeniorFriendly} trackColor={{ true: Colors.primary }} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data e hora</Text>

            <Text style={styles.label}>Data *</Text>
            <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnText}>{format(date, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}</Text>
              <Text style={styles.dateBtnIcon}>📅</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              />
            )}

            <Text style={styles.label}>Hora de início *</Text>
            <Pressable style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateBtnText}>{format(startTime, 'HH:mm')}</Text>
              <Text style={styles.dateBtnIcon}>🕐</Text>
            </Pressable>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour
                onChange={(_, d) => { setShowStartPicker(false); if (d) setStartTime(d); }}
              />
            )}

            <Text style={styles.label}>Hora de fim *</Text>
            <Pressable style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.dateBtnText}>{format(endTime, 'HH:mm')}</Text>
              <Text style={styles.dateBtnIcon}>🕐</Text>
            </Pressable>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour
                onChange={(_, d) => { setShowEndPicker(false); if (d) setEndTime(d); }}
              />
            )}

            {endTime > startTime && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  Duração: {Math.round((endTime.getTime() - startTime.getTime()) / 60000)} minutos
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Local e capacidade</Text>

            <Text style={styles.label}>Nome do local *</Text>
            <TextInput style={styles.input} placeholder="ex: Parque Eduardo VII" value={locationName} onChangeText={setLocationName} />

            <Text style={styles.label}>Latitude *</Text>
            <TextInput style={styles.input} placeholder="ex: 38.7223" value={locationLat} onChangeText={setLocationLat} keyboardType="decimal-pad" />

            <Text style={styles.label}>Longitude *</Text>
            <TextInput style={styles.input} placeholder="ex: -9.1504" value={locationLng} onChangeText={setLocationLng} keyboardType="decimal-pad" />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Mín. participantes *</Text>
                <TextInput style={styles.input} value={minParticipants} onChangeText={setMinParticipants} keyboardType="number-pad" />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Máx. participantes *</Text>
                <TextInput style={styles.input} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
              </View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preço e notas</Text>

            <Text style={styles.label}>Preço por pessoa (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00 (grátis)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>Deixa em branco ou 0 para sessão gratuita</Text>

            <Text style={styles.label}>Política de cancelamento</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Política específica desta sessão (opcional)..."
              value={cancellationPolicy}
              onChangeText={setCancellationPolicy}
              multiline numberOfLines={3}
            />

            <Text style={styles.label}>Notas para participantes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="ex: Trazer tapete de yoga, roupa confortável..."
              value={notes}
              onChangeText={setNotes}
              multiline numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.label}>Guardar como rascunho</Text>
                <Text style={styles.hint}>Publica mais tarde a partir do teu painel</Text>
              </View>
              <Switch value={isDraft} onValueChange={setIsDraft} trackColor={{ true: Colors.primary }} />
            </View>

            {/* Summary preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Resumo</Text>
              <Text style={styles.previewRow}>📋 {title}</Text>
              <Text style={styles.previewRow}>📅 {format(date, "d MMM yyyy", { locale: ptBR })} · {format(startTime, 'HH:mm')}–{format(endTime, 'HH:mm')}</Text>
              <Text style={styles.previewRow}>📍 {locationName || '—'}</Text>
              <Text style={styles.previewRow}>👥 {minParticipants}–{maxParticipants} participantes</Text>
              <Text style={styles.previewRow}>💶 {price ? `€${parseFloat(price).toFixed(2)}` : 'Grátis'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.nextBtnText}>
              {step < 4 ? 'Continuar →' : (isDraft ? 'Guardar rascunho' : 'Publicar sessão')}
            </Text>
          )}
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
  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[3],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotText: { fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.textSecondary },
  stepDotTextActive: { color: Colors.textInverse },
  stepLabel: { fontSize: 10, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center' },
  stepLabelActive: { color: Colors.primary, fontFamily: FontFamily.semibold },
  scroll: { padding: Spacing[5], paddingBottom: 120 },
  section: { gap: Spacing[4] },
  sectionTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text, marginBottom: -8 },
  hint: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: -8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
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
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], borderWidth: 1, borderColor: Colors.border,
    gap: Spacing[3],
  },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
  },
  dateBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text },
  dateBtnIcon: { fontSize: 18 },
  durationBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    padding: Spacing[3], alignItems: 'center',
  },
  durationText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  row: { flexDirection: 'row', gap: Spacing[3] },
  halfField: { flex: 1, gap: Spacing[2] },
  previewCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing[4], ...Shadow.sm, gap: Spacing[2],
    borderWidth: 1, borderColor: Colors.border,
  },
  previewTitle: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 4 },
  previewRow: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: 34,
  },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
