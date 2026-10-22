import express from 'express';
import systemUsersRouter from './authRegister/systemUsers';
import systemSecurityLogsRouter from './authRegister/systemSecurityLogs';
import userPermissionsRouter from './authRegister/userPermissions';
import establishmentUsersRouter from './authRegister/establishmentUsers';
import establishmentUserAdminRouter from './authRegister/establishmentUserAdmin';
import setupBootstrapRouter from './authRegister/setupBootstrap';

const router = express.Router();

router.use(systemUsersRouter);
router.use(systemSecurityLogsRouter);
router.use(userPermissionsRouter);
router.use(establishmentUsersRouter);
router.use(establishmentUserAdminRouter);
router.use(setupBootstrapRouter);

export default router;
