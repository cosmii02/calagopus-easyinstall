import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { serializeForApi } from '@/lib/serialization/api-transform.ts';
import { settingsSchema } from '../lib/schemas.ts';

export default async (data: z.infer<typeof settingsSchema>): Promise<void> => {
  await axiosInstance.put(
    '/api/admin/extensions/dev.cosmii02.easyinstall/settings',
    serializeForApi(settingsSchema, data),
  );
};
