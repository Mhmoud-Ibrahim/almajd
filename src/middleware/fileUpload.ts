import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { AppError } from '../utils/appError';

// إعداد Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

export const fileUpload = (folderName: string) => {
    // استخدمنا (as any) هنا لحل مشكلة عدم وجود تعريفات (Types) للمكتبة
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: async (req: any, file: any) => {
            return {
                folder: `nooreen/${folderName}`,
                format: 'jpg',
                public_id: Date.now() + "-" + file.originalname.split('.')[0],
            };
        },
    } as any);

    function fileFilter(req: any, file: Express.Multer.File, cb: any) {
        if (file.mimetype.startsWith('image')) {
            cb(null, true);
        } else {
            cb(new AppError('Images only allowed', 400), false);
        }
    }

    const upload = multer({ 
        storage: storage as any, // تحويل النوع ليتوافق مع multer
        fileFilter,
        limits: { fileSize: 2 * 1024 * 1024 } 
    });
    
    return upload;
}

export const uploadSingleFile = (fieldName: string, folderName: string) =>
    fileUpload(folderName).single(fieldName);

export const uploadMixOfFiles = (arrayOfFields: multer.Field[], folderName: string) =>
    fileUpload(folderName).fields(arrayOfFields);
