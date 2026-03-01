import { AuditLog } from '../models/AuditLog.server';
import type mongoose from 'mongoose';

export async function logAudit(
  action: string,
  collection: string,
  documentId: string | mongoose.Types.ObjectId,
  changes?: Record<string, unknown>,
  ip?: string,
  userId?: string,
  username?: string,
): Promise<void> {
  try {
    await AuditLog.create({ action, targetCollection: collection, documentId, changes, ip, userId, username });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}

interface AuditFilters {
  userId?: string;
  action?: string;
  collection?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getRecentAudits(limit: number = 50, offset: number = 0) {
  const [entries, total] = await Promise.all([
    AuditLog.find()
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'username')
      .lean()
      .exec(),
    AuditLog.countDocuments(),
  ]);
  return { entries, total };
}

export async function getFilteredAudits(filters: AuditFilters, limit: number = 50, offset: number = 0) {
  const query: Record<string, unknown> = {};

  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.collection) query.targetCollection = filters.collection;
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.$gte = filters.startDate;
    if (filters.endDate) dateFilter.$lte = filters.endDate;
    query.timestamp = dateFilter;
  }

  const [entries, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'username')
      .lean()
      .exec(),
    AuditLog.countDocuments(query),
  ]);
  return { entries, total };
}

export async function getAuditsByUser(userId: string, limit: number = 50) {
  return AuditLog.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
    .exec();
}
