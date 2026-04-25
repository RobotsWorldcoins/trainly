import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadow } from '@constants/typography';
import { supabase, uploadFile } from '@lib/supabase';
import { useAuthStore } from '@stores/auth.store';
import { SESSION_CATEGORIES } from '@trainyx/shared';

type Step = 'personal' | 'professional' | 'documents' | 'declarations';

export default function TrainerApplyScreen() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuthStore();
  const [step, setStep] = useState<Step>('personal');
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    professional_name: '',
    nif: '',
    iban: '',
    years_experience: '',
    certifications_desc: '',
    insurance_provider: '',
    insurance_policy_num: '',
    insurance_expires_at: '',
    specialties: [] as string[],
    accepts_trainer_terms: false,
    accepts_safety_rules: false,
    declares_autonomous: false,
    declares_fit_to_train: false,
  });

  const [documents, setDocuments] = useState<{
    type: string;
    file: { uri: string; name: string; mimeType: string };
  }[]>([]);

  const updateField = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleSpecialty = (cat: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(cat)
        ? prev.specialties.filter(s => s !== cat)
        : [...prev.specialties, cat],
    }));
  };

  const pickDocument = async (docType: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDocuments(prev => [
        ...prev.filter(d => d.type !== docType),
        { type: docType, file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' } },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const allDeclarations = form.accepts_trainer_terms && form.accepts_safety_rules &&
      form.declares_autonomous && form.declares_fit_to_train;

    if (!allDeclarations) {
      Alert.alert('Erro', 'Deves aceitar todas as declarações para submeter.');
      return;
    }

    setIsLoading(true);
    try {
      // Create application
      const { data: application, error: appError } = await supabase
        .from('trainer_applications')
        .insert({
          user_id: user.id,
          status: 'submitted',
          full_name: form.full_name,
          professional_name: form.professional_name || null,
          nif: form.nif || null,
          iban: form.iban || null,
          years_experience: form.years_experience ? parseInt(form.years_experience) : null,
          specialties: form.specialties,
          certifications_desc: form.certifications_desc || null,
          insurance_provider: form.insurance_provider || null,
          insurance_policy_num: form.insurance_policy_num || null,
          insurance_expires_at: form.insurance_expires_at || null,
          accepts_trainer_terms: form.accepts_trainer_terms,
          accepts_safety_rules: form.accepts_safety_rules,
          declares_autonomous: form.declares_autonomous,
          declares_fit_to_train: form.declares_fit_to_train,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (appError) throw appError;

      // Upload documents
      for (const doc of documents) {
        const path = `trainer-docs/${user.id}/${application.id}/${doc.type}-${Date.now()}`;
        const url = await uploadFile('trainer-documents', path, {
          uri: doc.file.uri,
          type: doc.file.mimeType,
          name: doc.file.name,
        });

        await supabase.from('trainer_documents').insert({
          application_id: application.id,
          user_id: user.id,
          type: doc.type,
          file_name: doc.file.name,
          storage_path: path,
          mime_type: doc.file.mimeType,
        });
      }

      // Update profile role to trainer_pending
      await supabase
        .from('profiles')
        .update({ role: 'trainer_pending' })
        .eq('user_id', user.id);

      await refreshProfile();

      Alert.alert(
        'Candidatura Enviada! 🎉',
        'A tua candidatura foi submetida. Receberás uma resposta em até 48 horas.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/(tabs)/profile') }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'personal', label: 'Pessoal' },
    { key: 'professional', label: 'Profissional' },
    { key: 'documents', label: 'Documentos' },
    { key: 'declarations', label: 'Declarações' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>{t('trainer.application_title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <Pressable
              style={[styles.stepDot, step === s.key && styles.stepDotActive,
                steps.findIndex(x => x.key === step) > i && styles.stepDotDone]}
              onPress={() => setStep(s.key)}
            >
              <Text style={[styles.stepNum, (step === s.key || steps.findIndex(x => x.key === step) > i) && styles.stepNumActive]}>
                {i + 1}
              </Text>
            </Pressable>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, steps.findIndex(x => x.key === step) > i && styles.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Step: Personal */}
        {step === 'personal' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('trainer.personal_info')}</Text>

            {[
              { key: 'full_name', label: 'Nome Completo *', placeholder: 'João Silva' },
              { key: 'professional_name', label: 'Nome Profissional', placeholder: 'João Trainer' },
              { key: 'nif', label: 'NIF', placeholder: '123456789' },
              { key: 'iban', label: 'IBAN', placeholder: 'PT50 0000 0000 0000 0000 0000 0' },
            ].map(field => (
              <View key={field.key} style={styles.inputGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[field.key]}
                  onChangeText={v => updateField(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
          </View>
        )}

        {/* Step: Professional */}
        {step === 'professional' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('trainer.professional_info')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Anos de Experiência</Text>
              <TextInput
                style={styles.input}
                value={form.years_experience}
                onChangeText={v => updateField('years_experience', v)}
                keyboardType="numeric"
                placeholder="ex: 5"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Certificações (descreve)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.certifications_desc}
                onChangeText={v => updateField('certifications_desc', v)}
                multiline
                numberOfLines={4}
                placeholder="ex: CREF, Personal Trainer certificado pela..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Especialidades</Text>
              <View style={styles.specialtyGrid}>
                {SESSION_CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.key}
                    style={[styles.specialtyChip,
                      form.specialties.includes(cat.key) && styles.specialtyChipActive]}
                    onPress={() => toggleSpecialty(cat.key)}
                  >
                    <Text style={[styles.specialtyText,
                      form.specialties.includes(cat.key) && styles.specialtyTextActive]}>
                      {cat.label_pt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Seguradora</Text>
              <TextInput
                style={styles.input}
                value={form.insurance_provider}
                onChangeText={v => updateField('insurance_provider', v)}
                placeholder="Nome da seguradora"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nº Apólice</Text>
              <TextInput
                style={styles.input}
                value={form.insurance_policy_num}
                onChangeText={v => updateField('insurance_policy_num', v)}
                placeholder="Número da apólice de seguro"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Step: Documents */}
        {step === 'documents' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('trainer.documents')}</Text>
            <Text style={styles.stepSubtitle}>
              Envia os documentos necessários para verificação.
            </Text>

            {[
              { type: 'id_document', label: '🪪 Identificação', desc: 'Cartão de Cidadão ou Passaporte' },
              { type: 'certification', label: '📜 Certificação', desc: 'Diploma ou certificado profissional' },
              { type: 'insurance', label: '🛡️ Seguro', desc: 'Comprovativo de seguro de responsabilidade civil' },
            ].map(doc => {
              const uploaded = documents.find(d => d.type === doc.type);
              return (
                <View key={doc.type} style={styles.docCard}>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    <Text style={styles.docDesc}>{doc.desc}</Text>
                    {uploaded && (
                      <Text style={styles.docUploaded}>✓ {uploaded.file.name}</Text>
                    )}
                  </View>
                  <Pressable
                    style={[styles.uploadButton, uploaded && styles.uploadButtonDone]}
                    onPress={() => pickDocument(doc.type)}
                  >
                    <Text style={styles.uploadButtonText}>
                      {uploaded ? 'Alterar' : 'Enviar'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Step: Declarations */}
        {step === 'declarations' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('trainer.declarations')}</Text>

            {[
              { key: 'accepts_trainer_terms', label: 'Aceito os Termos e Condições do Treinador TrainyX' },
              { key: 'accepts_safety_rules', label: 'Aceito as Regras de Segurança e Conduta da TrainyX' },
              { key: 'declares_autonomous', label: 'Declaro que sou trabalhador independente/autónomo' },
              { key: 'declares_fit_to_train', label: 'Declaro que estou física e mentalmente apto para conduzir sessões de treino' },
            ].map(decl => (
              <Pressable
                key={decl.key}
                style={[styles.declaration, (form as any)[decl.key] && styles.declarationActive]}
                onPress={() => updateField(decl.key, !(form as any)[decl.key])}
              >
                <View style={[styles.checkbox, (form as any)[decl.key] && styles.checkboxActive]}>
                  {(form as any)[decl.key] && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.declarationText}>{decl.label}</Text>
              </Pressable>
            ))}

            <View style={styles.legalNote}>
              <Text style={styles.legalNoteText}>
                Ao submeter esta candidatura, confirmo que todas as informações fornecidas são verdadeiras e precisas.
                Compreendo que fornecer informações falsas pode resultar na rejeição ou cancelamento da conta.
              </Text>
            </View>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navButtons}>
          {step !== 'personal' && (
            <Pressable
              style={styles.backButton}
              onPress={() => {
                const idx = steps.findIndex(s => s.key === step);
                if (idx > 0) setStep(steps[idx - 1].key);
              }}
            >
              <Text style={styles.backButtonText}>← Anterior</Text>
            </Pressable>
          )}

          {step !== 'declarations' ? (
            <Pressable
              style={styles.nextButton}
              onPress={() => {
                const idx = steps.findIndex(s => s.key === step);
                if (idx < steps.length - 1) setStep(steps[idx + 1].key);
              }}
            >
              <Text style={styles.nextButtonText}>Próximo →</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>{t('trainer.submit_application')}</Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[5], paddingVertical: Spacing[4],
  },
  back: { fontSize: FontSize.xl, color: Colors.text, width: 32 },
  title: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.text },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing[8], marginBottom: Spacing[5],
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepDotDone: { borderColor: Colors.success, backgroundColor: Colors.success },
  stepNum: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, color: Colors.textMuted },
  stepNumActive: { color: Colors.textInverse },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  stepLineDone: { backgroundColor: Colors.success },
  scroll: { paddingHorizontal: Spacing[5] },
  stepContent: { gap: Spacing[4] },
  stepTitle: { fontSize: FontSize.lg, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: Spacing[2] },
  stepSubtitle: { fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.textSecondary, marginBottom: Spacing[2] },
  inputGroup: { gap: Spacing[2] },
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    fontSize: FontSize.base, fontFamily: FontFamily.regular, color: Colors.text,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  specialtyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  specialtyChip: {
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderWidth: 1.5, borderColor: Colors.border,
  },
  specialtyChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  specialtyText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.textSecondary },
  specialtyTextActive: { color: Colors.textInverse },
  docCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4],
    flexDirection: 'row', alignItems: 'center', gap: Spacing[4], ...Shadow.sm,
  },
  docInfo: { flex: 1 },
  docLabel: { fontSize: FontSize.base, fontFamily: FontFamily.bold, color: Colors.text },
  docDesc: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: Colors.textSecondary, marginTop: 2 },
  docUploaded: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, color: Colors.success, marginTop: 4 },
  uploadButton: {
    backgroundColor: Colors.primaryAlpha10, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
    borderWidth: 1, borderColor: Colors.primary,
  },
  uploadButtonDone: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  uploadButtonText: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold, color: Colors.primary },
  declaration: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3],
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4],
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  declarationActive: { borderColor: Colors.primary },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { fontSize: 12, color: Colors.textInverse, fontFamily: FontFamily.bold },
  declarationText: { flex: 1, fontSize: FontSize.base, fontFamily: FontFamily.medium, color: Colors.text, lineHeight: FontSize.base * 1.4 },
  legalNote: { backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing[4], marginTop: Spacing[2] },
  legalNoteText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, color: '#92400E', lineHeight: FontSize.sm * 1.5 },
  navButtons: { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[8] },
  backButton: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing[4], alignItems: 'center',
  },
  backButtonText: { fontSize: FontSize.base, fontFamily: FontFamily.semibold, color: Colors.textSecondary },
  nextButton: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  nextButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  submitButton: {
    flex: 2, backgroundColor: Colors.success, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4], alignItems: 'center',
  },
  submitButtonText: { fontSize: FontSize.md, fontFamily: FontFamily.bold, color: Colors.textInverse },
  buttonDisabled: { opacity: 0.6 },
});
