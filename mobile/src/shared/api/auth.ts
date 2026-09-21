import { api } from './client';
import {
  AuthResponse,
  ChangePhoneStartResponse,
  SendEmailResponse,
  StartLoginResponse,
  StartRegistrationResponse,
  User,
} from '../lib/types';

export const authApi = {
  async registerPhone(phone: string): Promise<StartRegistrationResponse> {
    const res = await api.post('/auth/register/phone', { phone });
    return res.data;
  },

  async registerEmail(registrationToken: string, email: string): Promise<SendEmailResponse> {
    const res = await api.post('/auth/register/email', {
      registration_token: registrationToken,
      email,
    });
    return res.data;
  },

  async registerVerify(registrationToken: string, code: string): Promise<AuthResponse> {
    const res = await api.post('/auth/register/verify', {
      registration_token: registrationToken,
      code,
    });
    return res.data;
  },

  async login(phone: string, deviceId: string): Promise<StartLoginResponse> {
    const res = await api.post('/auth/login', { phone, device_id: deviceId });
    return res.data;
  },

  async logout(refresh: string): Promise<void> {
    await api.post('/auth/logout', { refresh });
  },

  async me(): Promise<User> {
    const res = await api.get('/me');
    return res.data;
  },

  async changePhoneStart(newPhone: string): Promise<ChangePhoneStartResponse> {
    const res = await api.post('/me/change-phone/start', { new_phone: newPhone });
    return res.data;
  },

  async changePhoneConfirm(challengeId: string, code: string): Promise<User> {
    const res = await api.post('/me/change-phone/confirm', {
      challenge_id: challengeId,
      code,
    });
    return res.data;
  },
};
