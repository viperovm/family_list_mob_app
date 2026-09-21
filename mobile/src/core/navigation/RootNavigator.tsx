import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../../features/auth/store';
import { useTheme } from '../../shared/design-system';

// Auth screens
import { PhoneScreen } from '../../features/auth/PhoneScreen';
import { EmailScreen } from '../../features/auth/EmailScreen';
import { CodeScreen } from '../../features/auth/CodeScreen';

// Lists screens
import { ListsHomeScreen } from '../../features/lists/ListsHomeScreen';
import { ListDetailScreen } from '../../features/lists/ListDetailScreen';
import { CreateListScreen } from '../../features/lists/CreateListScreen';

// Groups screens
import { GroupsHomeScreen } from '../../features/groups/GroupsHomeScreen';
import { CreateGroupScreen } from '../../features/groups/CreateGroupScreen';
import { GroupDetailScreen } from '../../features/groups/GroupDetailScreen';
import { AddFriendsScreen } from '../../features/groups/AddFriendsScreen';

// Invitations
import { InvitationsScreen } from '../../features/invitations/InvitationsScreen';

// Settings
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { ChangePhoneScreen } from '../../features/settings/ChangePhoneScreen';

import type {
  AuthStackParamList,
  GroupsStackParamList,
  ListsStackParamList,
  MainTabParamList,
  SettingsStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ListsStack = createNativeStackNavigator<ListsStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Email" component={EmailScreen} />
      <AuthStack.Screen name="Code" component={CodeScreen} />
    </AuthStack.Navigator>
  );
}

function ListsNavigator() {
  return (
    <ListsStack.Navigator>
      <ListsStack.Screen
        name="ListsHome"
        component={ListsHomeScreen}
        options={{ title: 'Списки', headerShown: false }}
      />
      <ListsStack.Screen name="ListDetail" component={ListDetailScreen} options={{ headerShown: false }} />
      <ListsStack.Screen name="CreateList" component={CreateListScreen} options={{ title: 'Новый список' }} />
    </ListsStack.Navigator>
  );
}

function GroupsNavigator() {
  return (
    <GroupsStack.Navigator>
      <GroupsStack.Screen name="GroupsHome" component={GroupsHomeScreen} options={{ headerShown: false }} />
      <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Новая группа' }} />
      <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Группа' }} />
      <GroupsStack.Screen name="AddFriends" component={AddFriendsScreen} options={{ title: 'Пригласить' }} />
      <GroupsStack.Screen name="Invitations" component={InvitationsScreen} options={{ title: 'Приглашения' }} />
    </GroupsStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ headerShown: false }} />
      <SettingsStack.Screen name="ChangePhone" component={ChangePhoneScreen} options={{ title: 'Смена номера' }} />
    </SettingsStack.Navigator>
  );
}

function TabIcon({ focused, emoji }: { focused: boolean; emoji: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 20, color: focused ? theme.colors.primary : theme.colors.textSecondary }}>
        {emoji}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="ListsTab"
        component={ListsNavigator}
        options={{ tabBarLabel: 'Списки', tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📋" /> }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsNavigator}
        options={{ tabBarLabel: 'Группы', tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👥" /> }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{ tabBarLabel: 'Настройки', tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="⚙️" /> }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <MainTabs /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
});