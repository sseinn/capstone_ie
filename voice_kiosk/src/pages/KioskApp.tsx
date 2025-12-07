// src/pages/KioskApp.tsx
import { useEffect, useState } from "react";
import { useKioskSocket } from "@/hooks/useKioskSocket";
import { useMicStream } from "@/hooks/useMicStream";
import { useKioskStore } from "@/store/kioskStore";
import MainContent from "@/components/main/MainContent";
import Idle from "@/components/Idle";

export default function KioskApp() {
  const storeId = import.meta.env.VITE_KIOSK_STORE_ID;

  // Idle에서 벗어나기 위한 상태
  const [isStarted, setIsStarted] = useState(false);

  // 화면 전환 기준 상태값
  const step = useKioskStore((s) => s.step);
  const setStep = useKioskStore((s) => s.setStep);

  // WebSocket & Mic
  const { wsRef, serverReady } = useKioskSocket(storeId, isStarted);
  const { startStreaming, stopStreaming } = useMicStream(wsRef);

  // 화면 터치 → 시작
  const handleTouch = () => {
    if (!isStarted) {
      console.log("👆 화면 터치 → Start");
      setIsStarted(true);
    }
  };

  // SERVER_READY → 마이크 시작 + Idle 탈출
  useEffect(() => {
    if (serverReady) {
      console.log("🚀 SERVER_READY → 마이크 시작 및 화면 표시");
      startStreaming();
      setIsStarted(true); // 🔥 Idle에 갇히는 문제 해결

      // step의 초기값이 유효한 상태인지 확인 후 보정
      const validStates = [
        "MENU_SELECTION",
        "CART_CONFIRMATION",
        "PAYMENT_CONFIRMATION",
        "COMPLETED",
        "CANCELLED",
      ];
      if (!validStates.includes(step)) {
        console.log("⚠️ step이 유효하지 않아 초기화:", step);
        setStep("MENU_SELECTION");
      }
    }
  }, [serverReady]);

  // 결제 완료 → 스트리밍 종료
  useEffect(() => {
    if (step === "COMPLETED") {
      console.log("💰 결제 완료 → 음성 스트리밍 중단");
      stopStreaming();
    }
  }, [step]);

  // 화면 렌더링 제어
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

    return <MainContent />; // 🔥 step에 따라 MainContent 내부에서 화면 전환
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
