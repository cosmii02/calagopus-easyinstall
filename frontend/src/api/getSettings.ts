import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { settingsSchema } from '../lib/schemas.ts';

export default async (): Promise<z.infer<typeof settingsSchema>> => {
  const { data } = await axiosInstance.get('/api/admin/extensions/dev.cosmii02.easyinstall/settings');
  return parseFromApi(settingsSchema, data.settings);
};
