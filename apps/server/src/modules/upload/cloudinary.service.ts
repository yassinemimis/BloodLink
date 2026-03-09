import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder:         'bloodlink/avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        },
      ).end(file.buffer);
    });
  }

  async deleteImage(url: string): Promise<void> {
    try {
      // استخراج public_id من الـ URL
      const parts   = url.split('/');
      const file    = parts[parts.length - 1].split('.')[0];
      const folder  = parts[parts.length - 2];
      const publicId = `${folder}/${file}`;
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // تجاهل خطأ الحذف
    }
  }
}