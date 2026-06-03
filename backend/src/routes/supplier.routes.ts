import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import * as supplierService from '../services/supplier.service';
import * as clientService from '../services/client.service';
import * as referralService from '../services/referral.service';

const router = Router();

// Apply auth + supplier role middleware to all routes
router.use(authMiddleware);
router.use(requireRole('supplier'));

/**
 * GET /api/supplier/me — get own profile + referral link + stats
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const supplier = await supplierService.findByUserId(userId);
    if (!supplier) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Supplier profile not found',
        },
      });
      return;
    }

    const referralCount = await clientService.countBySupplier(supplier.id);
    const referralLink = referralService.buildLink(supplier.referralCode);

    res.json({
      ...supplier,
      referralLink,
      referralCount,
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
 * GET /api/supplier/me/clients — get own referred clients (paginated)
 */
router.get('/me/clients', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const supplier = await supplierService.findByUserId(userId);
    if (!supplier) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Supplier profile not found',
        },
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));

    const result = await clientService.findBySupplier(supplier.id, page, pageSize);

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

export default router;
