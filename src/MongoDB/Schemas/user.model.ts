import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  profilePic: {
    public_id: string; 
    url: string;      
  };
   otp?: string | undefined; 
   otpExpires?: Date | null | undefined; 
  isVerified: boolean;
  
  comparePassword: (password: string) => Promise<boolean>;
}


const userSchema = new Schema<IUser>({
  fullName: { 
    type: String, 
    required: [true, 'الاسم مطلوب'],
    trim: true 
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true 
  },
  phoneNumber: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  password: { 
    type: String, 
    minlength: 6,
    select: false 
  },
  profilePic: {
    public_id: { 
      type: String, 
      default: "" 
    },
    url: { 
      type: String, 
      default: "https://cloudinary.com" 
    }
  },
  otp: String,
  otpExpires: Date,
  isVerified: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password!);
};

const User = model<IUser>('User', userSchema);
export default User;
