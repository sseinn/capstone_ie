//src/types/step.ts

export type State =
  | "MENU_SELECTION"
  | "PAYMENT_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

export type Event =
  | "CONFIRM_PAYMENT"
  | "PROCESS_PAYMENT"
  | "PREVIOUS"
  | "CANCEL";
