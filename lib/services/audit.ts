import connectDB from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';
import type { SessionUser } from '@/types/auth';
import type { AuditAction, AuditEntityType } from '@/types/attendance';

interface CreateAuditLogParams {
  actor: SessionUser;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId: string;
  before?: any;
  after?: any;
  reason?: string;
  requestId?: string;
}

/**
 * Creates an audit log entry. Strips sensitive fields (passwords, hashes) before storing.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await connectDB();

    const sanitizedBefore = sanitizeData(params.before);
    const sanitizedAfter = sanitizeData(params.after);

    await AuditLog.create({
      actorId: params.actor.id,
      actorRole: params.actor.role,
      action: params.action,
      entityType: params.entityType as any,
      entityId: params.entityId,
      before: sanitizedBefore,
      after: sanitizedAfter,
      reason: params.reason,
      requestId: params.requestId,
    });
  } catch (error) {
    // Log but don't fail the primary operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Remove sensitive fields from audit log data.
 */
function sanitizeData(
  data?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const sensitiveFields = [
    'passwordHash',
    'password',
    'token',
    'secret',
    'sessionId',
    '__v',
  ];

  const sanitized = { ...data };
  for (const field of sensitiveFields) {
    delete sanitized[field];
  }
  return sanitized;
}
