import { z } from 'zod';
import { axiosInstance } from '@/api/axios.ts';
import { parseFromApi } from '@/lib/serialization/api-transform.ts';
import { versionSchema } from '../lib/schemas.ts';

export default async (serverUuid: string, software: string): Promise<z.infer<typeof versionSchema>[]> => {
  const { data } = await axiosInstance.get(`/api/client/servers/${serverUuid}/easyinstall/versions/${software}`);
  return data.versions.map((version: unknown) => parseFromApi(versionSchema, version));
};
