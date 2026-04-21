import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius } from '@constants/typography';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  sender: { display_name: string; avatar_url: string | null };
}

export default function SessionMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`session-messages-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${id}` },
        async (payload) => {
          const { data } = await supabase
            .from('session_messages')
            .select('id, content, created_at, user_id, sender:profiles!user_id(display_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => [...prev, data as Message]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('session_messages')
      .select('id, content, created_at, user_id, sender:profiles!user_id(display_name, avatar_url)')
      .eq('session_id', id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as Message[]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    try {
      await supabase.from('session_messages').insert({
        session_id: id,
        user_id: user!.id,
        content: trimmed,
      });
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.user_id === user?.id;
    const prevMsg = messages[index - 1];
    const showSender = !isMe && (!prevMsg || prevMsg.user_id !== item.user_id);
    const sender = item.sender as any;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={[styles.senderDot, !showSender && styles.senderDotHidden]}>
            <Text style={styles.senderDotText}>{sender?.display_name?.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {showSender && (
            <Text style={styles.senderName}>{sender?.display_name}</Text>
          )}
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Chat da sessão</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>Sem mensagens ainda</Text>
                <Text style={styles.emptyHint}>Sê o primeiro a escrever!</Text>
              </View>
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Escreve uma mensagem..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
            >
              <Text style={styles.sendBtnIcon}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: FontSize.xl, color: Colors.text },
  headerTitle: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing[4], gap: Spacing[2], paddingBottom: Spacing[4] },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: Spacing[2] },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  emptyHint: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textMuted },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2] },
  msgRowMe: { flexDirection: 'row-reverse' },
  senderDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  senderDotHidden: { opacity: 0 },
  senderDotText: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.textInverse },
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
    gap: 2,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  senderName: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.primary, marginBottom: 2 },
  bubbleText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text },
  bubbleTextMe: { color: Colors.textInverse },
  bubbleTime: { fontSize: 10, fontFamily: FontFamily.regular, color: Colors.textMuted, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2],
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnIcon: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
