import { Router, Request, Response } from 'express';
import { login, AuthError } from '../services/auth.service';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
    return;
  }

  try {
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
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
