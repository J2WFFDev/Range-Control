import { Router, Request, Response } from 'express';
import * as resourceService from '../services/resource.service.js';

const router = Router();

// GET /api/resources - List all active resources
router.get('/', async (req: Request, res: Response) => {
  try {
    const resources = await resourceService.getResources();
    
    res.json({
      success: true,
      data: resources,
      count: resources.length
    });
  } catch (error: any) {
    console.error('Error listing resources:', error);
    res.status(500).json({ error: error.message || 'Failed to list resources' });
  }
});

// GET /api/resources/:id - Get resource by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const resource = await resourceService.getResourceById(id);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error: any) {
    console.error('Error getting resource:', error);
    res.status(500).json({ error: error.message || 'Failed to get resource' });
  }
});

// POST /api/resources - Create a new resource
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, capacity } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    const resource = await resourceService.createResource(name, type, description, capacity);
    
    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource created successfully'
    });
  } catch (error: any) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: error.message || 'Failed to create resource' });
  }
});

// PATCH /api/resources/:id - Update resource
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const resource = await resourceService.updateResource(id, updates);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({
      success: true,
      data: resource,
      message: 'Resource updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: error.message || 'Failed to update resource' });
  }
});

export default router;
