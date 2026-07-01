import { ESC_POS } from '../printing/types';

/** Trailing blank paper (~1.5–2 cm on 80 mm thermal, default line spacing). */
export const KITCHEN_TICKET_BOTTOM_FEED_LINES = 8;

/** Alert sequence for kitchen tickets — safe to send even if buzzer is absent. */
export function kitchenTicketAlertSequence(): string {
  return [
    ESC_POS.BEEP,
    ESC_POS.buzzer(3, 2),
    ESC_POS.epsonExternalBuzzer(1, 2),
  ].join('');
}

export function appendKitchenTicketFooter(parts: string[]): void {
  parts.push('--------------------------------', '');
  parts.push(ESC_POS.feedLines(KITCHEN_TICKET_BOTTOM_FEED_LINES));
  parts.push(ESC_POS.PARTIAL_CUT);
}
