import { Router, Request, Response } from 'express';
import * as referralService from '../services/referral.service';
import * as clientService from '../services/client.service';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors';

interface ReferralParams {
  code: string;
}

const router = Router();

/**
 * GET /api/referral/:code — validate referral code and return supplier name
 * Public endpoint — no auth required.
 */
router.get('/:code', async (req: Request<ReferralParams>, res: Response) => {
  try {
    const { code } = req.params;
    const result = await referralService.validateCode(code);

    if (!result.valid) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or inactive referral code',
        },
      });
      return;
    }

    res.json({ valid: true, supplierName: result.supplierName });
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
 * POST /api/referral/:code/register — register client via referral code
 * Public endpoint — no auth required.
 */
router.post('/:code/register', async (req: Request<ReferralParams>, res: Response) => {
  try {
    const { code } = req.params;
    const client = await clientService.register(req.body, code);

    res.status(201).json({
      success: true,
      message: 'Registration complete',
      client,
    });
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
