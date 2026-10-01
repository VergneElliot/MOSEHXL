import type { PinVerifyResult } from '../services/api/pin';
import { readTokenSessionId, type PinActorState } from './pinSessionsState';

/** Maps a PIN verify response to device-local actor state (includes server `sid`). */
export function pinActorFromVerify(result: PinVerifyResult): PinActorState {
  const token = result.pin_actor_token;
  return {
    token,
    userId: result.user_id,
    displayName: result.display_name,
    email: result.email,
    role: result.role,
    permissions: result.permissions ?? [],
    sessionId: result.pin_session_id ?? readTokenSessionId(token),
  };
}
