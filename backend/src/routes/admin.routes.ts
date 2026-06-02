import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as supplierService from '../services/supplier.service';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors';

interface SupplierParams {
  id: string;
}

const router = Router();
const prisma = new PrismaClient();

// Apply auth + admin role middleware to all routes
router.use(authMiddleware);
router.use(requireRole('admin'));

/**
 * POST /api/admin/suppliers — create supplier (admin only)
 */
router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          fields: err.fields,
        },
      });
      return;
    }

    if (err instanceof ConflictError) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: err.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/admin/suppliers — list all suppliers with stats, sorted by referral count desc
 */
router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const suppliers = await supplierService.findAll();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * GET /api/admin/suppliers/:id/clients — list clients for a supplier (paginated, sorted by date desc)
 */
router.get('/suppliers/:id/clients', async (req: Request<SupplierParams>, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));

    // Verify supplier exists
    const supplier = await supplierService.findById(id);
    if (!supplier) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        },
      });
      return;
    }

    const skip = (page - 1) * pageSize;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: { supplierId: id },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where: { supplierId: id } }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      data: clients,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * PATCH /api/admin/suppliers/:id/deactivate — deactivate supplier
 */
router.patch('/suppliers/:id/deactivate', async (req: Request<SupplierParams>, res: Response) => {
  try {
    const supplier = await supplierService.deactivate(req.params.id);
    res.json(supplier);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: err.message,
        },
      });
      return;
    }

    if (err instanceof ConflictError) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: err.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * PATCH /api/admin/suppliers/:id/reactivate — reactivate supplier
 */
router.patch('/suppliers/:id/reactivate', async (req: Request<SupplierParams>, res: Response) => {
  try {
    const supplier = await supplierService.reactivate(req.params.id);
    res.json(supplier);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: err.message,
        },
      });
      return;
    }

    if (err instanceof ConflictError) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: err.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
