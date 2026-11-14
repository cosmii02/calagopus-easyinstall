import { z } from 'zod';

export const statusSchema = z.object({
  configured: z.boolean(),
});

export const mcVersionSchema = z.object({
  version: z.string(),
  java: z.number(),
});

export const installSchema = z.object({
  software: z.string(),
  version: z.string(),
  truncateDirectory: z.boolean(),
});

export const settingsSchema = z.object({
  minecraftEggUuid: z.string().nullable(),
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
      source: z.enum(['detected', 'recorded', 'variables']),
    })
    .nullable(),
  latestBuild: buildSchema.nullable(),
  updateAvailable: z.boolean(),
  canUpdate: z.boolean(),
  newerVersion: z.string().nullable(),
});
