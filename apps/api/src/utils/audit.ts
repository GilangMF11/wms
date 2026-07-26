import type { Context } from 'hono';
import { db, schema } from '../db';

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
};

/**
 * Write an audit_log row. Runs AFTER the business operation succeeds,
 * outside its transaction, so audit survives even if the caller rolls back.
 * Never throws: audit failure must not break the main request.
 */
export async function writeAudit(c: Context, input: AuditInput) {
  try {
    const user = c.get('user');
    if (!user?.userId) return;
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      null;
    await db.insert(schema.auditLog).values({
      userId: user.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      ipAddress: ip,
    });
  } catch {
    // swallow: audit must not break the request
  }
}
