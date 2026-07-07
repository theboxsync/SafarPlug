import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string({ required_error: 'MONGODB_URI is required' }).min(1),
  JWT_ACCESS_SECRET: z.string({ required_error: 'JWT_ACCESS_SECRET is required' }).min(1),
  JWT_REFRESH_SECRET: z.string({ required_error: 'JWT_REFRESH_SECRET is required' }).min(1),
  CLOUDINARY_CLOUD_NAME: z.string({ required_error: 'CLOUDINARY_CLOUD_NAME is required' }).min(1),
  CLOUDINARY_API_KEY: z.string({ required_error: 'CLOUDINARY_API_KEY is required' }).min(1),
  CLOUDINARY_API_SECRET: z.string({ required_error: 'CLOUDINARY_API_SECRET is required' }).min(1),
  RAZORPAY_KEY_ID: z.string({ required_error: 'RAZORPAY_KEY_ID is required' }).min(1),
  RAZORPAY_KEY_SECRET: z.string({ required_error: 'RAZORPAY_KEY_SECRET is required' }).min(1),
  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration error:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
export default env;
