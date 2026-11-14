import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { serializeForApi } from '@/lib/serialization/api-transform.ts';
import { installSchema } from '../lib/schemas.ts';

export default async (serverUuid: string, data: z.infer<typeof installSchema>): Promise<void> => {
  await axiosInstance.post(
    `/api/client/servers/${serverUuid}/easyinstall/install`,
    serializeForApi(installSchema, data),
  );
};
