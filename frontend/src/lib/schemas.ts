import { z } from 'zod';

export const statusSchema = z.object({
  games: z.record(z.string(), z.boolean()),
});

export const versionSchema = z.object({
  version: z.string(),
  java: z.number().nullable(),
});

export const installSchema = z.object({
  software: z.string(),
  version: z.string(),
  truncateDirectory: z.boolean(),
});

export const settingsSchema = z.object({
  minecraftEggUuid: z.string().nullable(),
  bedrockEggUuid: z.string().nullable(),
  hytaleEggUuid: z.string().nullable(),
});

export const buildSchema = z.object({
  id: z.number(),
  software: z.string(),
  version: z.string().nullable(),
  buildNumber: z.number().nullable(),
  name: z.string(),
});

export const currentSchema = z.object({
  current: z
    .object({
      software: z.string(),
      version: z.string().nullable(),
      build: buildSchema.nullable(),
      installedVersion: z.string().nullable(),
      source: z.enum(['detected', 'recorded', 'pinned', 'variables']),
    })
    .nullable(),
  latest: z
    .object({
      version: z.string(),
      name: z.string(),
      build: buildSchema.nullable(),
    })
    .nullable(),
  updateAvailable: z.boolean(),
  canUpdate: z.boolean(),
  newerVersion: z.string().nullable(),
  autoUpdates: z.boolean(),
});
