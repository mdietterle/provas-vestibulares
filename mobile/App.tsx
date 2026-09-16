import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getFocusedRouteNameFromRoute, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import mobileAds from 'react-native-google-mobile-ads';

import AuthStack from './src/navigation/AuthStack';
import StudentHomeScreen from './src/screens/StudentHomeScreen';
import SimuladosStack from './src/navigation/SimuladosStack';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavBar from './src/components/BottomNavBar';
import { hasValidStudentSession } from './src/api/auth';
import { colors } from './src/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();

const TAB_KEY_TO_ROUTE: Record<string, string> = {
  dashboard: 'Dashboard',
  simulados: 'Simulados',
  perfil: 'Perfil',
};
const ROUTE_TO_TAB_KEY = Object.fromEntries(Object.entries(TAB_KEY_TO_ROUTE).map(([k, v]) => [v, k]));

function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute.name;
  const tabBarStyle = descriptors[activeRoute.key]?.options.tabBarStyle;
  if (tabBarStyle && (tabBarStyle as { display?: string }).display === 'none') {
    return null;
  }
  return (
    <BottomNavBar
      active={ROUTE_TO_TAB_KEY[activeRouteName]}
      onSelect={(key) => navigation.navigate(TAB_KEY_TO_ROUTE[key])}
    />
  );
}

function StudentTabs({ onLoggedOut }: { onLoggedOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard">
        {({ navigation }) => <StudentHomeScreen onLoggedOut={onLoggedOut} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen
        name="Simulados"
        component={SimuladosStack}
        options={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? 'SimuladosList';
          return {
            tabBarStyle: focusedRouteName === 'SimuladosList' ? undefined : { display: 'none' },
          };
        }}
      />
      <Tab.Screen name="Perfil">{() => <ProfileScreen onLoggedOut={onLoggedOut} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_500Medium,
  });

  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    hasValidStudentSession().then((valid) => {
      setIsLoggedIn(valid);
      setCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    mobileAds().initialize();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !checkingSession) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, checkingSession]);

  if (!fontsLoaded || checkingSession) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.academicNavy} />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView} style={{ flex: 1 }}>
      <NavigationContainer>
        {!isLoggedIn ? (
          <AuthStack onLoggedIn={() => setIsLoggedIn(true)} />
        ) : (
          <StudentTabs onLoggedOut={() => setIsLoggedIn(false)} />
        )}
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
