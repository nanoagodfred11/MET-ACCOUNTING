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
