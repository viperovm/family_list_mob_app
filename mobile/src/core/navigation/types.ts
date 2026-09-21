import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ID } from '../../shared/lib/types';

export type AuthStackParamList = {
  Phone: undefined;
  Email: undefined;
  Code: undefined;
  LoginChallenge: undefined;
};

export type MainTabParamList = {
  ListsTab: undefined;
  GroupsTab: undefined;
  SettingsTab: undefined;
};

export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: ID };
  CreateList: { groupId?: ID } | undefined;
};

export type GroupsStackParamList = {
  GroupsHome: undefined;
  CreateGroup: undefined;
  AddFriends: { groupId: ID };
  Invitations: undefined;
  GroupDetail: { groupId: ID };
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ChangePhone: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
