import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';

export default function EditProfileScreen() {
  const { user, profile, setProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Precisamos de acesso à galeria para alterar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri) return null;
    const ext = avatarUri.split('.').pop() || 'jpg';
    const fileName = `${user!.id}/avatar.${ext}`;

    const response = await fetch(avatarUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, uint8Array, { contentType: `image/${ext}`, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl + `?t=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('', 'O nome de exibição é obrigatório.');
      return;
    }

    setIsLoading(true);
    try {
      let avatarUrl = profile?.avatar_url || null;
      if (avatarUri) {
        avatarUrl = await uploadAvatar();
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      Alert.alert('Perfil atualizado!', '', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentAvatar = avatarUri || profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrapper} onPress={pickAvatar}>
            {currentAvatar ? (
              <Image source={{ uri: currentAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayName.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Toca para alterar a foto</Text>
        </View>

        {/* Fields */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nome de exibição *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="O teu nome"
              maxLength={60}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conta algo sobre ti..."
              multiline
              numberOfLines={4}
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telemóvel</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+351 9XX XXX XXX"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.readonlyField}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>{user?.email}</Text>
            </View>
            <Text style={styles.hint}>O email não pode ser alterado aqui</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.saveBtnText}>Guardar alterações</Text>
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
  scroll: { padding: Spacing[5], gap: Spacing[5], paddingBottom: 120 },
  avatarSection: { alignItems: 'center', gap: Spacing[2] },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 40, fontFamily: FontFamily.bold, color: Colors.textInverse },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 14 },
  avatarHint: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textMuted },
  form: { gap: Spacing[4] },
  field: { gap: Spacing[2] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'right' },
  readonlyField: { gap: Spacing[2] },
  readonlyInput: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
  },
  readonlyText: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textMuted },
  hint: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.textMuted },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[4], paddingBottom: 34,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
});
