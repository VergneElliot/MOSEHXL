import express from 'express';
import documentsRouter from './documents';
import inboxRouter from './inbox';
import reservationsRouter from './reservations';
import planningRouter from './planning';
import emailStatusRouter from './emailStatus';
import timeClockRouter from './timeClock';

const router = express.Router();

router.use('/documents', documentsRouter);
router.use('/inbox', inboxRouter);
router.use('/reservations', reservationsRouter);
router.use('/planning', planningRouter);
router.use('/email-status', emailStatusRouter);
router.use('/time-clock', timeClockRouter);

export default router;
