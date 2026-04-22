import express from 'express';
import loginRouter from './authLogin';
import registerRouter from './authRegister';
import passwordRouter from './authPassword';

const router = express.Router();
router.use(loginRouter);
router.use(registerRouter);
router.use(passwordRouter);

export default router;
