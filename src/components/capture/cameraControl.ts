// What the capture screen's primary button does while no photo is in review.
export interface CameraControl {
  label: string;
  disabled: boolean;
  trigger: () => void;
}

// Slot-scoped message, so a warning disappears once the worker moves on.
export interface SlotNotice {
  slot: string;
  message: string;
}
