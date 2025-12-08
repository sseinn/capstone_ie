// src/store/kioskStore.ts
import { create } from "zustand";
import type { Menu } from "@/types/messageType";
import type { State as KioskStep } from "@/types/step";

// useKioskSocket.ts에서 임포트 가능하도록 export interface로 정의
export interface CartState {
  menus: Menu[];
  menuCount: number;
  totalPrice: number;
}

interface KioskState {
  step: KioskStep;
  text: string;
  cart: CartState;

  setStep: (step: KioskStep) => void;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  setCart: (cart: CartState) => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  step: "MENU_SELECTION",
  text: "주문할 메뉴를 말씀해주세요.",
  cart: {
    menus: [],
    menuCount: 0,
    totalPrice: 0,
  },

  setStep: (step) => set({ step }),
  setText: (text) => set({ text }),
  appendText: (text) => set((state) => ({ text: state.text + text })),
  setCart: (cart) => set({ cart }),
}));