import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

async function fetchReviewSession(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, date, trainer:profiles!trainer_id(id, display_name, avatar_url)')
    .eq('id', sessionId)
    .single();
  if (error) throw error;
  return data;
}

export default function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['review-session', sessionId],
    queryFn: () => fetchReviewSession(sessionId),
  });

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('', 'Seleciona uma avaliação de 1 a 5 estrelas.');
      return;
    }

    setIsLoading(true);
    try {
      const trainer = session?.trainer as any;

      const { error } = await supabase.from('reviews').insert({
        session_id: sessionId,
        reviewer_id: user!.id,
        trainer_id: trainer?.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('', 'Já avaliaste esta sessão.');
          return;
        }
        throw error;
      }

      // Award XP for leaving a review
      await supabase.from('xp_logs').insert({
        user_id: user!.id,
        amount: 25,
        source: 'review_left',
        reference_id: sessionId,
        reference_type: 'session',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Avaliação enviada!',
        'Obrigado pelo teu feedback. +25 XP',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar a avaliação.');
    } finally {
      setIsLoading(false);
    }
  };

  const trainer = session?.trainer as any;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Avaliar sessão</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {session && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            {trainer && (
              <Text style={styles.trainerName}>com {trainer.display_name}</Text>
            )}
          </View>
        )}

        {/* Star rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Como foi a sessão?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => {
                  setRating(star);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[styles.star, star <= rating && styles.starFilled]}>
                  {star <= rating ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingDesc}>{getRatingDesc(rating)}</Text>
          )}
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Comentário (opcional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Partilha a tua experiência..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        <View style={styles.xpHint}>
          <Text style={styles.xpHintText}>💎 +25 XP por avaliar</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.submitBtn, (isLoading || rating === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading || rating === 0}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>Enviar avaliação</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getRatingDesc(rating: number) {
  const map = ['', 'Muito fraco', 'Fraco', 'Razoável', 'Bom', 'Excelente!'];
  return map[rating];
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
  scroll: { padding: Spacing[5], gap: Spacing[5], paddingBottom: 120 },
  sessionCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing[5], ...Shadow.sm, gap: Spacing[1],
  },
  sessionTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  trainerName: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary },
  ratingSection: { alignItems: 'center', gap: Spacing[3] },
  ratingLabel: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text },
  starsRow: { flexDirection: 'row', gap: Spacing[3] },
  star: { fontSize: 48, color: Colors.border },
  starFilled: { color: Colors.accent },
  ratingDesc: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.accent },
  commentSection: { gap: Spacing[2] },
  commentLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  commentInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
    minHeight: 120,
  },
  charCount: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'right' },
  xpHint: {
    backgroundColor: '#EFF6FF', borderRadius: BorderRadius.lg,
    padding: Spacing[4], alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  xpHintText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.primary },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: 34,
  },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
