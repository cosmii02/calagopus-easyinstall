import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { currentSchema } from '../lib/schemas.ts';

export default async (serverUuid: string): Promise<z.infer<typeof currentSchema>> => {
  const { data } = await axiosInstance.get(`/api/client/servers/${serverUuid}/easyinstall/current`);
  return parseFromApi(currentSchema, data);
};
