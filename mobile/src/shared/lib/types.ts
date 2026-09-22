export type ID = string;

export interface User {
  id: ID;
  phone: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
}

export interface Group {
  id: ID;
  name: string;
  role: 'owner' | 'admin' | 'member';
  members_count: number;
  pending_invitations_count: number;
  created_at: string;
}

export interface GroupMember {
  id: ID;
  user: { id: ID; phone: string };
  role: string;
  created_at: string;
}

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired';

export interface Invitation {
  id: ID;
  group: { id: ID; name: string };
  inviter: { id: ID; phone: string } | null;
  invitee_phone: string;
  status: InvitationStatus;
  created_at: string;
}

export interface InviteResponse {
  id: ID;
  group_id: ID;
  invitee_phone: string;
  status: InvitationStatus;
  /** Whether the invited phone already belongs to a registered user. */
  invitee_registered: boolean;
  push_sent: boolean;
}

export type ListVisibility = 'private' | 'group' | 'custom';
export type ListStatus = 'active' | 'archived';

export interface ListProgress {
  total: number;
  active: number;
  done: number;
  failed: number;
}

export interface ListPermissions {
  rename: boolean;
  manage_access: boolean;
  archive: boolean;
  restore: boolean;
  duplicate: boolean;
}

export interface ShoppingList {
  id: ID;
  group: { id: ID; name: string };
  owner: { id: ID; phone: string };
  name: string;
  visibility: ListVisibility;
  status: ListStatus;
  progress: ListProgress;
  permissions: ListPermissions;
  created_at: string;
  updated_at: string;
}

export interface ListDetail extends ShoppingList {
  participants: { id: ID; user: { id: ID; phone: string }; created_at: string }[];
  items: ListItem[];
}

export type ItemStatus = 'active' | 'done' | 'failed';

export interface ListItem {
  id: ID;
  text: string;
  status: ItemStatus;
  position: number;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface StartRegistrationResponse {
  registration_token: string;
  phone: string;
  exists: boolean;
}

export interface StartLoginResponse extends AuthResponse {
  login_challenge?: string;
  masked_email?: string;
}

export interface SendEmailResponse {
  masked_email: string;
  code_ttl_seconds: number;
}

export interface ChangePhoneStartResponse {
  challenge_id: ID;
  masked_email: string;
  code_ttl_seconds: number;
}

export interface ApiErrorEnvelope {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
}

export interface ApiErrorBody {
  error?: string | ApiErrorEnvelope;
  message?: string;
  fields?: Record<string, string[]>;
  detail?: string;
}

export interface DeviceInfo {
  platform: 'android' | 'ios';
  token: string;
}

export type ListSection = 'all' | 'private' | 'shared';
export type ListStatusFilter = 'active' | 'archived';
