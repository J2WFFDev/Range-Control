import type { AuditLogEntry } from '../types/index.js';
import type { PoolClient } from 'pg';
import pool from '../db/connection.js';

// Log an audit entry
export async function logAudit(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  
  await db.query(
    `INSERT INTO audit_log (
      request_id, action, actor, old_status, new_status, reason, metadata, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.request_id || null,
      entry.action,
      entry.actor,
      entry.old_status || null,
      entry.new_status || null,
      entry.reason || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ip_address || null,
      entry.user_agent || null
    ]
  );
}

// Get audit trail for a specific request
export async function getAuditTrail(requestId: number): Promise<AuditLogEntry[]> {
  const result = await pool.query(
    `SELECT * FROM audit_log WHERE request_id = $1 ORDER BY timestamp DESC`,
    [requestId]
  );
  
  return result.rows;
}

// Get all audit logs with optional filters
export async function getAuditLogs(filters?: {
  action?: string;
  actor?: string;
  from_date?: Date;
  to_date?: Date;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters?.action) {
    query += ` AND action = $${paramIndex}`;
    params.push(filters.action);
    paramIndex++;
  }
  
  if (filters?.actor) {
    query += ` AND actor = $${paramIndex}`;
    params.push(filters.actor);
    paramIndex++;
  }
  
  if (filters?.from_date) {
    query += ` AND timestamp >= $${paramIndex}`;
    params.push(filters.from_date);
    paramIndex++;
  }
  
  if (filters?.to_date) {
    query += ` AND timestamp <= $${paramIndex}`;
    params.push(filters.to_date);
    paramIndex++;
  }
  
  query += ' ORDER BY timestamp DESC';
  
  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }
  
  if (filters?.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }
  
  const result = await pool.query(query, params);
  return result.rows;
}
