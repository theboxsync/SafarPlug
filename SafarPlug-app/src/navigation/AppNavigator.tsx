import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../core/constants/colors';
import { useAuthStore } from '../store/authStore';

// Import Screens
import { SplashScreen } from '../screens/splash/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { StationDetailScreen } from '../screens/stationDetail/StationDetailScreen';
import { TripPlannerScreen } from '../screens/tripPlanner/TripPlannerScreen';
import { ChargingSessionScreen } from '../screens/session/ChargingSessionScreen';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { RegisterStationScreen } from '../screens/owner/RegisterStationScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ChargingHistoryScreen } from '../screens/history/ChargingHistoryScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  StationDetail: { stationId: string };
  ChargingSession: { sessionId: string };
  OwnerRegisterStation: { editMode?: boolean; stationId?: string } | undefined;
  OwnerDashboard: undefined;
  History: undefined;
};

export type TabParamList = {
  Home: undefined;
  TripPlanner: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primaryDark,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '900',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Find Chargers',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="TripPlanner"
        component={TripPlannerScreen}
        options={{
          title: 'Trip Planner',
          tabBarLabel: 'Planner',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛣️</Text>,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator = () => {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primaryDark,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '900',
        },
      }}
    >
      {/* If not hydrated, we show Splash screen */}
      {!isHydrated ? (
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
      ) : !user ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // App Stack (Authenticated)
        <>
          {user.userType === 'station_owner' ? (
            // Owner flow
            <>
              <Stack.Screen
                name="OwnerDashboard"
                component={OwnerDashboardScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OwnerRegisterStation"
                component={RegisterStationScreen}
                options={{ title: 'Register Station' }}
              />
            </>
          ) : (
            // Driver Flow
            <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="StationDetail"
                component={StationDetailScreen}
                options={{ title: 'Station Details' }}
              />
              <Stack.Screen
                name="ChargingSession"
                component={ChargingSessionScreen}
                options={{ title: 'Active Session', headerBackVisible: false }}
              />
            </>
          )}

          {/* Shared authenticated screens */}
          <Stack.Screen
            name="History"
            component={ChargingHistoryScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
