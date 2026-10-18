import type { z } from 'zod';

export function parseSeed<S extends z.ZodType>(name: string, schema: S, raw: unknown): z.infer<S> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.map(String).join('.') ?? '';
  throw new Error(`Seed ${name} is invalid at "${path}": ${issue?.message ?? 'unknown issue'}`);
}
