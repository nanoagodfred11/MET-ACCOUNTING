import mongoose, { Schema, type Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  targetCollection: string;
  documentId: mongoose.Types.ObjectId;
  changes?: Record<string, unknown>;
  ip?: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  targetCollection: { type: String, required: true },
  documentId: { type: Schema.Types.ObjectId, required: true },
  changes: { type: Schema.Types.Mixed },
  ip: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ targetCollection: 1, timestamp: -1 });
auditLogSchema.index({ documentId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog as mongoose.Model<IAuditLog> || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
