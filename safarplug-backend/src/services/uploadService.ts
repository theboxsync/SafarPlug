import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// Configure Cloudinary only if credentials are set
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const uploadToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      // Offline fallback: return a mock image URL
      console.log('Cloudinary not configured, returning mock URL');
      resolve(`https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/800/600`);
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'safarplug_stations' },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result?.secure_url || '');
      }
    );

    uploadStream.end(fileBuffer);
  });
};
