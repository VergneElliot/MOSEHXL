import { Router } from 'express';

import bridgeRoutes from './printing/bridgeRoutes';
import configurationRoutes from './printing/configurationRoutes';
import documentExportRoutes from './printing/documentExportRoutes';
import documentRoutes from './printing/documentRoutes';
import epsonRoutes from './printing/epsonRoutes';
import historyRoutes from './printing/historyRoutes';
import statusRoutes from './printing/statusRoutes';

export {
  getStatusResponse,
  testPrintResponse,
  printReceiptResponse,
  printClosureBulletinResponse,
  printInvoiceResponse,
} from './printing/handlers';

const router = Router();

router.use(epsonRoutes);
router.use(bridgeRoutes);
router.use(statusRoutes);
router.use(documentRoutes);
router.use(documentExportRoutes);
router.use(configurationRoutes);
router.use(historyRoutes);

export default router;
