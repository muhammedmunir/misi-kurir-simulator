import { create } from "zustand";

interface DeliveryUIState {
  hasPacket: boolean;
  trackingNumber: string | null;
  activeZone: string | null;
  activeZoneName: string | null;
  interactionMessage: string | null;
  interactionMessageTime: number;
  completeMessage: string | null;
  completeMessageTime: number;

  setHasPacket: (has: boolean) => void;
  setTrackingNumber: (tn: string | null) => void;
  setActiveZone: (id: string | null, name: string | null) => void;
  setInteractionMessage: (msg: string) => void;
  setCompleteMessage: (msg: string) => void;
  clearMessages: () => void;
}

export const useDeliveryUIStore = create<DeliveryUIState>((set) => ({
  hasPacket: false,
  trackingNumber: null,
  activeZone: null,
  activeZoneName: null,
  interactionMessage: null,
  interactionMessageTime: 0,
  completeMessage: null,
  completeMessageTime: 0,

  setHasPacket: (has) => set({ hasPacket: has }),
  setTrackingNumber: (tn) => set({ trackingNumber: tn }),
  setActiveZone: (id, name) => set({ activeZone: id, activeZoneName: name }),
  setInteractionMessage: (msg) => set({ interactionMessage: msg, interactionMessageTime: Date.now() }),
  setCompleteMessage: (msg) => set({ completeMessage: msg, completeMessageTime: Date.now() }),
  clearMessages: () => set({ interactionMessage: null, completeMessage: null }),
}));
