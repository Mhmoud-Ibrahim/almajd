import mongoose, { Document, Schema, model } from "mongoose";

// 1. تعريف الـ Interface
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    userImage?: string; 
    role: string; 
    googleId?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
}

// 2. تعريف الـ Schema
const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // سيتم تخزينها مشفرة جاهزة
    userImage: { type: String },
    googleId: { type: String, required: false },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'employee'],
        default: 'user'
    },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
}, {
    timestamps: true,
    versionKey: false
});

// ملاحظة: تم حذف الـ pre-save لأن التشفير يتم يدوياً في الكنترولر لضمان استقرار TypeScript
export const User = model<IUser>('User', UserSchema);
