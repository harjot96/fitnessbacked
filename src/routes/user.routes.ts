import { Router } from 'express';
import { getUserById, searchUsers } from '../controllers/user.controller';
import { requireAuth } from '../auth/middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get user by ID
router.get('/:id', getUserById);

// Search users
router.get('/search', searchUsers);

export default router;
