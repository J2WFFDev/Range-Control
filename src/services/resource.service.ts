import pool from '../db/connection.js';
import type { Resource } from '../types/index.js';

// Get all active resources
export async function getResources(): Promise<Resource[]> {
  const result = await pool.query(
    'SELECT * FROM resources WHERE is_active = true ORDER BY type, name'
  );
  return result.rows;
}

// Get resource by ID
export async function getResourceById(id: number): Promise<Resource | null> {
  const result = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// Create a new resource
export async function createResource(
  name: string,
  type: string,
  description?: string,
  capacity?: number
): Promise<Resource> {
  const result = await pool.query(
    `INSERT INTO resources (name, type, description, capacity)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, type, description || null, capacity || null]
  );
  return result.rows[0];
}

// Update resource
export async function updateResource(
  id: number,
  updates: Partial<Pick<Resource, 'name' | 'type' | 'description' | 'capacity' | 'is_active'>>
): Promise<Resource | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(updates.name);
    paramIndex++;
  }
  
  if (updates.type !== undefined) {
    fields.push(`type = $${paramIndex}`);
    values.push(updates.type);
    paramIndex++;
  }
  
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex++;
  }
  
  if (updates.capacity !== undefined) {
    fields.push(`capacity = $${paramIndex}`);
    values.push(updates.capacity);
    paramIndex++;
  }
  
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex}`);
    values.push(updates.is_active);
    paramIndex++;
  }
  
  if (fields.length === 0) {
    return getResourceById(id);
  }
  
  values.push(id);
  const result = await pool.query(
    `UPDATE resources SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}
