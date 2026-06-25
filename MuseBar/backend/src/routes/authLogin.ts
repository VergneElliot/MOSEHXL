import express from 'express';
import loginRoutes from './authLogin/loginRoutes';
import sessionRoutes from './authLogin/sessionRoutes';
import supportRoutes from './authLogin/supportRoutes';
import totpRoutes from './authLogin/totpRoutes';

const router = express.Router();

router.use('/', loginRoutes);
router.use('/2fa/totp', totpRoutes);
router.use('/', sessionRoutes);
router.use('/', supportRoutes);

export default router;

