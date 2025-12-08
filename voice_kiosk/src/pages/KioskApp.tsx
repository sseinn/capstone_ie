// src/pages/KioskApp.tsx
import { useEffect, useState, useCallback } from "react";
import { useKioskSocket } from "@/hooks/useKioskSocket";
import { useMicStream } from "@/hooks/useMicStream";
import { useKioskStore } from "@/store/kioskStore";
import type { State } from "@/types/step";

import MainContent from "@/components/main/MainContent";
import Idle from "@/components/Idle";

// 유효한 상태 목록을 컴포넌트 외부에 정의하여 렌더링마다 재생성 방지
const VALID_STATES: State[] = [
  "MENU_SELECTION",
  "PAYMENT_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
];

export default function KioskApp() {
  const rawStoreId = new URLSearchParams(location.search).get("storeId");
  const storeId = rawStoreId ?? import.meta.env.VITE_KIOSK_STORE_ID;

  const [isStarted, setIsStarted] = useState(false);

  // kiosk store
  const step = useKioskStore((s) => s.step) as State;
  const setStep = useKioskStore((s) => s.setStep);

  // WebSocket & Mic
  // ✅ useKioskSocket에서 sendMessage를 받아와 사용합니다.
  const { wsRef, serverReady, sendMessage } = useKioskSocket(storeId, isStarted);
  const { startStreaming, stopStreaming } = useMicStream(wsRef);

  // 화면 터치 → 시작 및 결제 로직
  // useCallback을 사용하여 handleTouch 함수가 불필요하게 재생성되는 것을 방지합니다.
  const handleTouch = useCallback(() => {
    // 1. PAYMENT_CONFIRMATION 상태에서 터치 → PROCESS_PAYMENT 전송
    if (isStarted && step === "PAYMENT_CONFIRMATION") {
      sendMessage({
        messageType: "PROCESS_PAYMENT",
        content: { paymentMethod: "ANY" },
      });
      return;
    }

    // 2. 첫 터치 → 시스템 시작
    if (!isStarted) {
      setIsStarted(true);
    }
  }, [isStarted, step, sendMessage]);

  // 음성 스트리밍 제어 및 상태 초기화
  useEffect(() => {
    if (!serverReady) return; // 서버가 준비되지 않으면 실행하지 않음

    console.log("SERVER_READY → start mic control");

    // 1. 스트리밍 시작 제어
    // COMPLETED나 CANCELLED가 아니면 스트리밍 시작
    if (step !== "COMPLETED" && step !== "CANCELLED") {
      startStreaming();
    } else {
      // 결제/취소 완료 상태면 스트리밍 중단
      stopStreaming();
    }

    // 2. 유효하지 않은 상태일 경우 MENU_SELECTION으로 강제 이동
    if (!VALID_STATES.includes(step)) {
      console.warn(`⚠️ 유효하지 않은 상태 감지: ${step}. MENU_SELECTION으로 재설정합니다.`);
      setStep("MENU_SELECTION");
    }

    // cleanup: 컴포넌트 언마운트 시 또는 의존성 변경 시 정리
    return () => {
      // isStarted가 true일 때만 stopStreaming을 호출하도록 유지
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