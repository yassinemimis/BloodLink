import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import MapScreen from '../screens/map/MapScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Search: '🔍',
    Map: '🗺️',
    Notifications: '🔔',
    Profile: '👤',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22 }}>{icons[name]}</Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        },
        headerStyle: { backgroundColor: '#DC2626' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Accueil', headerTitle: '🩸 BloodLink' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Recherche' }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Carte' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alertes' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}