import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize } from '@constants/typography';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';

const NOTICE_TYPES: Record<string, { emoji: string; color: string; label: string }> = {
  announcement:  { emoji: '📢', color: '#6366F1', label: 'Anúncio' },
  session_update: { emoji: '📅', color: '#F59E0B', label: 'Sessão' },
  platform:      { emoji: '🚀', color: '#10B981', label: 'TrainyX' },
  local_news:    { emoji: '📍', color: '#EC4899', label: 'Lisboa' },
  trainer_tip:   { emoji: '💡', color: '#0EA5E9', label: 'Dica' },
};

// Mock timeline data until DB table is built
const MOCK_FEED = [
  {
    id: '1', type: 'announcement', title: 'Bem-vindo ao TrainyX! 🎉',
    body: 'Explora sessões de treino ao ar livre perto de ti. O mapa está cheio de treinadores incríveis!',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    author: 'Equipa TrainyX', pinned: true,
  },
  {
    id: '2', type: 'local_news', title: 'Novo percurso no Parque Eduardo VII',
    body: 'Esta semana temos 3 novos treinadores no parque. Experimenta sessões de corrida, yoga e HIIT!',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    author: 'Equipa TrainyX', pinned: false,
  },
  {
    id: '3', type: 'trainer_tip', title: 'Hidrata-te antes de treinar',
    body: 'Com o calor de Lisboa, lembra-te de beber água antes, durante e depois do teu treino ao ar livre.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    author: 'Dra. Ana Santos (Coach Pro)', pinned: false,
  },
  {
    id: '4', type: 'platform', title: 'Função de check-in melhorada',
    body: 'Já podes fazer check-in até 15 minutos antes do início da sessão. Mais flexibilidade para ti!',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    author: 'Equipa TrainyX', pinned: false,
  },
  {
    id: '5', type: 'session_update', title: 'Sessão de Yoga cancelada',
    body: 'A sessão de yoga de amanhã no Jardim da Estrela foi cancelada. Reembolso automático em 3-5 dias úteis.',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    author: 'Joana Trainer', pinned: false,
  },
];

export default function FeedScreen() {
  const { profile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // In production this would fetch from a `announcements` table
  const { data: feed = MOCK_FEED, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => MOCK_FEED,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: typeof MOCK_FEED[0] }) => {
    const type = NOTICE_TYPES[item.type] ?? NOTICE_TYPES.announcement;
    const timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: pt });

    return (
      <View style={[styles.card, item.pinned && styles.cardPinned]}>
        {item.pinned && (
          <View style={styles.pinnedBadge}>
            <Text style={styles.pinnedText}>📌 Fixado</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
            <Text style={styles.typeEmoji}>{type.emoji}</Text>
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.typeBadge, { backgroundColor: type.color + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: type.color }]}>{type.label}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>
        <Text style={styles.cardAuthor}>— {item.author}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <Text style={styles.headerSubtitle}>Novidades & anúncios</Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontFamily: FontFamily.bold, color: Colors.text },
  headerSubtitle: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardPinned: { borderWidth: 1.5, borderColor: Colors.primary + '40' },
  pinnedBadge: { marginBottom: 10 },
  pinnedText: { fontSize: 11, fontFamily: FontFamily.medium, color: Colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeEmoji: { fontSize: 22 },
  cardMeta: { flex: 1, gap: 4 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontFamily: FontFamily.semibold },
  timeAgo: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textMuted },
  cardTitle: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 8, lineHeight: 22 },
  cardBody: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  cardAuthor: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.textMuted },
});
