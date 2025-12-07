// src/components/main/MainContent.tsx
import { useKioskStore } from "@/store/kioskStore";
import MenuSelection from "./MenuSelection";
import CartConfirmation from "./CartConfirmation";
import PaymentConfirmation from "./PaymentConfirmation";
import Completed from "./Completed";

export default function MainContent() {
  const step = useKioskStore((s) => s.step); // 👈 핵심

  switch (step) {
    case "MENU_SELECTION":
      return <MenuSelection />;
    case "CART_CONFIRMATION":
      return <CartConfirmation />;
    case "PAYMENT_CONFIRMATION":
      return <PaymentConfirmation />;
    case "COMPLETED":
      return <Completed />;
    default:
      return null;
  }
}
