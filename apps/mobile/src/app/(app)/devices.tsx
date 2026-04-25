import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';

interface DeviceCard {
  id: string;
  name: string;
  icon: string;
  type: 'watch' | 'phone' | 'band' | 'scale';
  connected: boolean;
  lastSync?: string;
  metrics?: { steps?: number; calories?: number; distance?: number; heartRate?: number };
}

const AVAILABLE_DEVICES = [
  { id: 'apple_health', name: 'Apple Health', icon: '❤️', type: 'phone' as const, desc: 'Sincroniza passos, calorias e exercício do iPhone' },
  { id: 'google_fit', name: 'Google Fit / Health Connect', icon: '🏃', type: 'phone' as const, desc: 'Sincroniza dados de atividade do Android' },
  { id: 'garmin', name: 'Garmin Connect', icon: '⌚', type: 'watch' as const, desc: 'Sincroniza treinos e dados do teu Garmin' },
  { id: 'polar', name: 'Polar Flow', icon: '🔵', type: 'watch' as const, desc: 'Treinos e dados de FC do Polar' },
  { id: 'fitbit', name: 'Fitbit', icon: '💚', type: 'band' as const, desc: 'Passos, sono e FC da pulseira Fitbit' },
  { id: 'suunto', name: 'Suunto App', icon: '🟠', type: 'watch' as const, desc: 'Dados GPS e FC dos relógios Suunto' },
  { id: 'whoop', name: 'WHOOP', icon: '⚡', type: 'band' as const, desc: 'Recuperação, stress e carga de treino' },
  { id: 'strava', name: 'Strava', icon: '🟠', type: 'phone' as const, desc: 'Importa atividades do Strava' },
];

// Mock connected device for demo
const MOCK_CONNECTED: DeviceCard = {
  id: 'demo_watch',
  name: 'Demo Smartwatch',
  icon: '⌚',
  type: 'watch',
  connected: true,
  lastSync: 'Há 5 minutos',
  metrics: { steps: 7843, calories: 412, distance: 5.2, heartRate: 68 },
};

export default function DevicesScreen() {
  const [connectedDevices, setConnectedDevices] = useState<DeviceCard[]>([MOCK_CONNECTED]);
  const [autoSync, setAutoSync] = useState(true);

  const handleConnect = (device: typeof AVAILABLE_DEVICES[0]) => {
    Alert.alert(
      `Ligar ${device.name}`,
      `Em breve poderás ligar o teu ${device.name} ao TrainyX.\n\nEsta funcionalidade estará disponível na próxima atualização.`,
      [{ text: 'OK' }]
    );
  };

  const handleDisconnect = (deviceId: string) => {
    Alert.alert(
      'Desligar dispositivo',
      'Tens a certeza que queres desligar este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desligar',
          style: 'destructive',
          onPress: () => setConnectedDevices(prev => prev.filter(d => d.id !== deviceId)),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispositivos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>📱⌚💪</Text>
          <Text style={styles.heroTitle}>Conecta o teu equipamento</Text>
          <Text style={styles.heroSubtitle}>
            Liga os teus wearables e apps de saúde para um acompanhamento completo dos teus treinos.
          </Text>
        </View>

        {/* Connected devices */}
        {connectedDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔗 Dispositivos Ligados</Text>
            {connectedDevices.map(device => (
              <View key={device.id} style={styles.connectedCard}>
                <View style={styles.connectedHeader}>
                  <View style={styles.deviceIconWrap}>
                    <Text style={styles.deviceIcon}>{device.icon}</Text>
                    <View style={styles.connectedDot} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.lastSync}>Última sync: {device.lastSync}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={() => handleDisconnect(device.id)}
                  >
                    <Text style={styles.disconnectText}>Desligar</Text>
                  </TouchableOpacity>
                </View>

                {device.metrics && (
                  <View style={styles.metricsRow}>
                    {device.metrics.steps !== undefined && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricValue}>{device.metrics.steps.toLocaleString()}</Text>
                        <Text style={styles.metricLabel}>Passos</Text>
                      </View>
                    )}
                    {device.metrics.calories !== undefined && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricValue}>{device.metrics.calories}</Text>
                        <Text style={styles.metricLabel}>kcal</Text>
                      </View>
                    )}
                    {device.metrics.distance !== undefined && (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricValue}>{device.metrics.distance} km</Text>
                        <Text style={styles.metricLabel}>Distância</Text>
                      </View>
                    )}
                    {device.metrics.heartRate !== undefined && (
                      <View style={styles.metricChip}>
                        <Text style={[styles.metricValue, { color: '#EF4444' }]}>{device.metrics.heartRate} bpm</Text>
                        <Text style={styles.metricLabel}>FC repouso</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>🔧 Demo — dados simulados</Text>
                </View>
              </View>
            ))}

            {/* Auto sync toggle */}
            <View style={styles.syncToggle}>
              <View>
                <Text style={styles.syncLabel}>Sincronização automática</Text>
                <Text style={styles.syncDesc}>Sincroniza dados em segundo plano</Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>
          </View>
        )}

        {/* Available integrations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Disponíveis em breve</Text>
          {AVAILABLE_DEVICES.map(device => (
            <TouchableOpacity
              key={device.id}
              style={styles.availableCard}
              onPress={() => handleConnect(device)}
              activeOpacity={0.7}
            >
              <Text style={styles.availableIcon}>{device.icon}</Text>
              <View style={styles.availableInfo}>
                <Text style={styles.availableName}>{device.name}</Text>
                <Text style={styles.availableDesc}>{device.desc}</Text>
              </View>
              <View style={styles.connectBtn}>
                <Text style={styles.connectBtnText}>Ligar</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Privacidade em primeiro lugar</Text>
          <Text style={styles.infoText}>
            Os teus dados de saúde são apenas teus. Apenas métricas de treino relevantes são partilhadas com os teus treinadores, com a tua autorização.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.text },
  scroll: { flex: 1 },
  hero: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.text, marginBottom: 12 },
  connectedCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: Colors.primary + '40' },
  connectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  deviceIconWrap: { position: 'relative' },
  deviceIcon: { fontSize: 32 },
  connectedDot: { position: 'absolute', right: -2, top: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: Colors.surface },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontFamily: FontFamily.semibold, color: Colors.text },
  lastSync: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
  disconnectText: { fontSize: 12, fontFamily: FontFamily.medium, color: '#EF4444' },
  metricsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  metricChip: { flex: 1, minWidth: '22%', backgroundColor: Colors.background, borderRadius: 12, padding: 10, alignItems: 'center' },
  metricValue: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.text },
  metricLabel: { fontSize: 10, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  mockBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  mockBadgeText: { fontSize: 11, fontFamily: FontFamily.medium, color: '#92400E' },
  syncToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 14, padding: 14 },
  syncLabel: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.text },
  syncDesc: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  availableCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 8, gap: 12 },
  availableIcon: { fontSize: 28, width: 36, textAlign: 'center' },
  availableInfo: { flex: 1 },
  availableName: { fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.text },
  availableDesc: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textMuted, marginTop: 2, lineHeight: 16 },
  connectBtn: { backgroundColor: Colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  connectBtnText: { fontSize: 12, fontFamily: FontFamily.semibold, color: Colors.primary },
  infoCard: { margin: 16, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16 },
  infoTitle: { fontSize: 14, fontFamily: FontFamily.semibold, color: '#1E40AF', marginBottom: 6 },
  infoText: { fontSize: 13, fontFamily: FontFamily.regular, color: '#3B82F6', lineHeight: 18 },
});
