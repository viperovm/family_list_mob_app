import { api } from './client';
import { DeviceInfo } from '../lib/types';

export const devicesApi = {
  async register(token: string): Promise<DeviceInfo> {
    const res = await api.post('/devices/', {
      platform: 'android',
      token,
    });
    return res.data;
  },
};
