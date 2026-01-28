import { Router, Request, Response } from 'express';
import * as auditService from '../services/audit.service.js';

const router = Router();

// GET /api/audit - Get all audit logs with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      action: req.query.action as string,
      actor: req.query.actor as string,
      from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
      to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };
    
    const logs = await auditService.getAuditLogs(filters);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: error.message || 'Failed to get audit logs' });
  }
});

// GET /api/audit/:request_id - Get audit trail for specific request
router.get('/:request_id', async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.request_id);
    const trail = await auditService.getAuditTrail(requestId);
    
    res.json({
      success: true,
      data: trail,
      count: trail.length
    });
  } catch (error: any) {
    console.error('Error getting audit trail:', error);
    res.status(500).json({ error: error.message || 'Failed to get audit trail' });
  }
});

export default router;
