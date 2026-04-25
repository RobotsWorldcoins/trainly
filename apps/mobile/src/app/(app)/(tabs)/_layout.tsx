import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@constants/colors';
import { FontFamily } from '@constants/typography';
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
    <Pressable onPress={onPress} style={styles.createButton}>
      <View style={styles.createButtonInner}>
        <Text style={styles.createButtonIcon}>+</Text>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
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
      {/* Map / Explore */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Mapa" emoji="🗺️" focused={focused} />
          ),
        }}
      />

      {/* Agenda / Calendar */}
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Agenda" emoji="📅" focused={focused} />
          ),
        }}
      />

      {/* Create (centre FAB) */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Criar',
          tabBarButton: (props) => (
            <CreateTabButton {...props} onPress={handleCreatePress} />
          ),
        }}
      />

      {/* Feed / Timeline */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Feed" emoji="📡" focused={focused} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Perfil" emoji="👤" focused={focused} />
          ),
        }}
      />

      {/* Hidden tabs — still navigable by URL */}
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
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
  tabEmoji: { fontSize: 20 },
  tabLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
  },
  tabLabelFocused: { color: Colors.primary },
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
    color: '#FFFFFF',
    lineHeight: 32,
    fontFamily: FontFamily.regular,
  },
});
