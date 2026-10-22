import express from 'express';
import floorOngoingFulfillment from './floorOngoingFulfillment';
import floorTicketDraftItems from './floorTicketDraftItems';
import floorPlans from './floor/plans';
import floorTables from './floor/tables';
import floorTickets from './floor/tickets';
import floorTicketLines from './floor/ticketsLines';
import floorTicketsPrint from './floor/ticketsPrint';
import floorWaiter from './floor/waiter';

const router = express.Router();
router.use(floorOngoingFulfillment);
router.use(floorTicketDraftItems);
router.use(floorPlans);
router.use(floorTables);
router.use(floorTickets);
router.use(floorTicketLines);
router.use(floorTicketsPrint);
router.use(floorWaiter);

export default router;
