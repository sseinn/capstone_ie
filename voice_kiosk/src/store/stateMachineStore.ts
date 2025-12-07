// src/store/stateMachineStore.ts
import { create } from "zustand";
import type { State, Event } from "@/types/step";

interface StateMachine {
  currentState: State;
  transition: (event: Event) => void;
}

export const useStateMachine = create<StateMachine>((set) => ({
  currentState: "MENU_SELECTION",

  transition: (event) =>
    set((state) => {
      switch (state.currentState) {
        case "MENU_SELECTION":
          if (event === "CONFIRM_CART") return { currentState: "CART_CONFIRMATION" };
          if (event === "CANCEL") return { currentState: "CANCELLED" };
          break;

        case "CART_CONFIRMATION":
          if (event === "CONFIRM_PAYMENT") return { currentState: "PAYMENT_CONFIRMATION" };
          if (event === "PREVIOUS") return { currentState: "MENU_SELECTION" };
          if (event === "CANCEL") return { currentState: "CANCELLED" };
          break;

        case "PAYMENT_CONFIRMATION":
          if (event === "PROCESS_PAYMENT") return { currentState: "COMPLETED" };
          if (event === "PREVIOUS") return { currentState: "CART_CONFIRMATION" }; // 🔥 수정됨
          if (event === "CANCEL") return { currentState: "CANCELLED" };
          break;

        case "COMPLETED":
          if (event === "CANCEL") return { currentState: "MENU_SELECTION" }; // 🔥 복귀 허용
          break;

        case "CANCELLED":
          if (event === "PREVIOUS") return { currentState: "MENU_SELECTION" }; // 🔥 복귀 허용
          break;
      }
      return state;
    }),
}));
