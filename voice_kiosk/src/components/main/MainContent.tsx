// src/components/main/MainContent.tsx
import { useKioskStore } from "@/store/kioskStore";
import MenuSelection from "./MenuSelection";
import PaymentConfirmation from "./PaymentConfirmation";
import Completed from "./Completed";

export default function MainContent() {
  const step = useKioskStore((s) => s.step);

  switch (step) {
    case "MENU_SELECTION":
      return <MenuSelection />;
    case "PAYMENT_CONFIRMATION":
      return <PaymentConfirmation />;
    case "COMPLETED":
      return <Completed />;
    default:
      return null;
  }
}