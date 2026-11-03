import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://fitlife:fitlife_dev_password@localhost:5432/fitlife_db'),
  JWT_SECRET: z.string().min(16).default('fitlife_super_secret_jwt_key_2026_dev_only'),
  REFRESH_SECRET: z.string().min(16).default('fitlife_super_secret_refresh_key_2026_dev_only'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW: z.string().default('1 minute'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
