import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/colors';
import { FontFamily, FontSize } from '@constants/typography';
import { useAuthStore } from '@stores/auth.store';

function TabIcon({ name, emoji, focused }: { name: string; emoji: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{name}</Text>
    </View>
  );
}

function CreateTabButton({ children, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.createButton}
    >
      <View style={styles.createButtonInner}>
        <Text style={styles.createButtonIcon}>+</Text>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isTrainer } = useAuthStore();

  const handleCreatePress = () => {
    if (isTrainer()) {
      router.push('/(app)/create-session');
    } else {
      router.push('/(app)/create-group');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('map.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={t('map.title')} emoji="🗺️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: t('sessions.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={t('sessions.title')} emoji="📅" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('create.title'),
          tabBarButton: (props) => (
            <CreateTabButton {...props} onPress={handleCreatePress} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={t('progress.title')} emoji="📈" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={t('profile.title')} emoji="👤" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 2,
  },
  tabIconFocused: {},
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
  },
  tabLabelFocused: {
    color: Colors.primary,
  },
  createButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonIcon: {
    fontSize: 28,
    color: Colors.textInverse,
    lineHeight: 32,
    fontFamily: FontFamily.regular,
  },
});
