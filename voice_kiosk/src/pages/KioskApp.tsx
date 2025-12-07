// src/pages/KioskApp.tsx
import { useEffect, useState } from "react";
import { useKioskSocket } from "@/hooks/useKioskSocket";
import { useMicStream } from "@/hooks/useMicStream";
import { useKioskStore } from "@/store/kioskStore";
import MainContent from "@/components/main/MainContent";
import Idle from "@/components/Idle";

export default function KioskApp() {
  const storeId = import.meta.env.VITE_KIOSK_STORE_ID;
  const [isStarted, setIsStarted] = useState(false);

  const step = useKioskStore((s) => s.step);
  const setStep = useKioskStore((s) => s.setStep);

  const { wsRef, serverReady } = useKioskSocket(storeId, isStarted);
  const { startStreaming, stopStreaming } = useMicStream(wsRef);

  // 화면 터치 이벤트
  const handleTouch = () => {
    if (!isStarted) {
      setIsStarted(true);
      return;
    }

    // 💳 PAYMENT_CONFIRMATION에서 터치하면 → PROCESS_PAYMENT 전송
    if (step === "PAYMENT_CONFIRMATION" && wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          messageType: "PROCESS_PAYMENT",
          content: { paymentMethod: "CARD" },
        })
      );
      console.log("💳 PROCESS_PAYMENT 전송됨 (화면 터치)");
    }
  };

  useEffect(() => {
    if (serverReady) {
      startStreaming();

      if (
        step !== "MENU_SELECTION" &&
        step !== "PAYMENT_CONFIRMATION" &&
        step !== "COMPLETED" &&
        step !== "CANCELLED"
      ) {
        setStep("MENU_SELECTION");
      }
    }

    return () => {
      stopStreaming();
    };
  }, [serverReady]);

  const renderScreen = () => {
    if (!isStarted || !serverReady) {
      return (
        <Idle
          isStarted={isStarted}
          serverReady={serverReady}
          handleTouch={handleTouch}
        />
      );
    }

    return <MainContent />;
  };

  return (
    <div
      className="w-[1080px] h-[1920px] overflow-hidden"
      onClick={handleTouch}
    >
      {renderScreen()}
    </div>
  );
}
