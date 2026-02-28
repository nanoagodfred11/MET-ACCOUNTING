import mongoose, { Schema, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserRole = {
  MET_ACCOUNTANT: 'met_accountant',
  PLANT_MANAGER: 'plant_manager',
  LAB_TECHNICIAN: 'lab_technician',
  ADMIN: 'admin',
} as const;

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.LAB_TECHNICIAN,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    const { password: _, ...rest } = ret;
    return rest;
  },
});

export const User = mongoose.models.User as mongoose.Model<IUser> || mongoose.model<IUser>('User', userSchema);
