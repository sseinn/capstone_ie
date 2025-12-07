// src/pages/KioskApp.tsx
import { useEffect, useState } from "react";
import { useKioskSocket } from "@/hooks/useKioskSocket";
import { useMicStream } from "@/hooks/useMicStream";
import { useKioskStore } from "@/store/kioskStore";
import type { State } from "@/types/step";

import MainContent from "@/components/main/MainContent";
import Idle from "@/components/Idle";

export default function KioskApp() {
  const storeId = import.meta.env.VITE_KIOSK_STORE_ID;
  const [isStarted, setIsStarted] = useState(false);

  // kiosk store
  const step = useKioskStore((s) => s.step) as State;
  const setStep = useKioskStore((s) => s.setStep);

  // WebSocket & Mic
  const { wsRef, serverReady } = useKioskSocket(storeId, isStarted);
  const { startStreaming, stopStreaming } = useMicStream(wsRef);

  // 화면 터치 → 시작
  const handleTouch = () => {
    // PAYMENT_CONFIRMATION 상태에서 터치 → PROCESS_PAYMENT 전송
    if (isStarted && step === "PAYMENT_CONFIRMATION") {
      wsRef.current?.send(
        JSON.stringify({
          messageType: "PROCESS_PAYMENT",
          content: { paymentMethod: "ANY" },
        })
      );
      return;
    }

    if (!isStarted) {
      setIsStarted(true);
    }
  };

  // 음성 스트리밍 제어
  useEffect(() => {
    if (serverReady) {
      console.log("SERVER_READY → start mic");

      if (step !== "COMPLETED" && step !== "CANCELLED") {
        startStreaming();
      }

      // 유효 상태 목록만 인정
      const validStates: State[] = [
        "MENU_SELECTION",
        "PAYMENT_CONFIRMATION",
        "COMPLETED",
        "CANCELLED",
      ];

      if (!validStates.includes(step)) {
        setStep("MENU_SELECTION");
      }
    }

    return () => {
      if (isStarted) stopStreaming();
    };
  }, [serverReady, isStarted, step, startStreaming, stopStreaming, setStep]);

  // 화면 렌더링
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
