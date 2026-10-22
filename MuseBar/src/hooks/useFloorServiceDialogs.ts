import { useCallback, useRef, useState } from 'react';
import * as floorApi from '../services/api/floor';
import type { PinActorState } from '../contexts/PinSessionsContext';
import { pinActorFromVerify } from '../contexts/pinActorFromVerify';
import type { FloorMapPendingAction, FloorMapPurpose } from './floorServiceContext';

/** PIN dialog + floor map dialog state for the Caisse (badge-in, open map for an action). */
export function useFloorServiceDialogs(input: {
  pinActor: PinActorState | null;
  addOrFocusSession: (actor: PinActorState) => string;
  onInfo: (message: string) => void;
}) {
  const { pinActor, addOrFocusSession, onInfo } = input;

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapPurpose, setMapPurpose] = useState<FloorMapPurpose>('default');
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');
  const pendingAfterPin = useRef<'map' | null>(null);
  const pendingMapAction = useRef<FloorMapPendingAction>(null);

  const badgeIn = useCallback(
    async (pin: string) => {
      const result = await floorApi.verifyPin(pin);
      const actor = pinActorFromVerify(result);
      addOrFocusSession(actor);
      setPinDialogOpen(false);
      onInfo(`Session : ${actor.displayName}`);
      if (pendingAfterPin.current === 'map') {
        pendingAfterPin.current = null;
        setMapDialogOpen(true);
      }
    },
    [addOrFocusSession, onInfo]
  );

  const setMyPin = useCallback(
    async (pin: string) => {
      await floorApi.setPin(pin);
      onInfo('PIN enregistré — vous pouvez ouvrir une session');
      setPinDialogMode('verify');
    },
    [onInfo]
  );

  const openPinDialog = useCallback((mode: 'verify' | 'set' = 'verify') => {
    setPinDialogMode(mode);
    setPinDialogOpen(true);
  }, []);

  const requestMap = useCallback(() => {
    if (!pinActor) {
      pendingAfterPin.current = 'map';
      openPinDialog('verify');
      return;
    }
    setMapPurpose('default');
    setMapDialogOpen(true);
  }, [pinActor, openPinDialog]);

  const openMapForAction = useCallback(
    (action: Exclude<FloorMapPendingAction, null>) => {
      pendingMapAction.current = action;
      setMapPurpose(action);
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      setMapDialogOpen(true);
    },
    [pinActor, openPinDialog]
  );

  const openMapForMoveTable = useCallback(() => {
    setMapPurpose('move-table');
    if (!pinActor) {
      pendingAfterPin.current = 'map';
      openPinDialog('verify');
      return;
    }
    setMapDialogOpen(true);
  }, [pinActor, openPinDialog]);

  const closeMapDialog = useCallback(() => {
    pendingMapAction.current = null;
    setMapPurpose('default');
    setMapDialogOpen(false);
  }, []);

  return {
    pinDialogOpen,
    setPinDialogOpen,
    pinDialogMode,
    setPinDialogMode,
    mapDialogOpen,
    setMapDialogOpen,
    mapPurpose,
    setMapPurpose,
    pendingAfterPin,
    pendingMapAction,
    badgeIn,
    setMyPin,
    openPinDialog,
    requestMap,
    openMapForAction,
    openMapForMoveTable,
    closeMapDialog,
  };
}
