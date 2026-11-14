import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { statusSchema } from '../lib/schemas.ts';

export default async (serverUuid: string): Promise<z.infer<typeof statusSchema>> => {
  const { data } = await axiosInstance.get(`/api/client/servers/${serverUuid}/easyinstall`);
  return parseFromApi(statusSchema, data);
};
