import { User, type IUser } from '../models/User.server';
import { logAudit } from './auditService.server';

interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role: string;
}

interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
}

export class UserService {
  async getAll() {
    return User.find().sort({ createdAt: -1 }).lean().exec();
  }

  async getById(id: string) {
    return User.findById(id).lean().exec();
  }

  async create(dto: CreateUserDTO, actorId?: string) {
    const existing = await User.findOne({
      $or: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) {
      throw new Error(
        existing.username === dto.username
          ? 'Username already exists'
          : 'Email already exists'
      );
    }

    const user = await User.create(dto);
    logAudit('create', 'user', user._id, { username: dto.username, role: dto.role }, undefined, actorId);
    return user.toJSON();
  }

  async update(id: string, dto: UpdateUserDTO, actorId?: string) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    const old = { username: user.username, email: user.email, role: user.role };

    if (dto.username !== undefined) user.username = dto.username;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) user.password = dto.password;

    await user.save();
    logAudit('update', 'user', id, { old, new: { username: user.username, email: user.email, role: user.role } }, undefined, actorId);
    return user.toJSON();
  }

  async delete(id: string, actorId?: string) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    await User.findByIdAndDelete(id);
    logAudit('delete', 'user', id, { username: user.username }, undefined, actorId);
  }
}

export const userService = new UserService();
