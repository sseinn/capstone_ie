// src/hooks/useKioskSocket.ts
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useKioskStore } from "@/store/kioskStore";
import usePcmPlayer from "@/hooks/usePcmPlayer";
import type { State } from "@/types/step";

export const useKioskSocket = (storeId: string, connect: boolean) => {
  const wsRef = useRef<WebSocket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [serverReady, setServerReady] = useState(false);

  const setCart = useKioskStore((s) => s.setCart);
  const setText = useKioskStore((s) => s.setText);
  const appendText = useKioskStore((s) => s.appendText);
  const setStep = useKioskStore((s) => s.setStep);
  const step = useKioskStore((s) => s.step);

  const firstChunkRef = useRef(true);
  const pcmPlayer = usePcmPlayer();

  useEffect(() => {
    if (!connect || !storeId || !accessToken) return;

    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/stores/${storeId}/websocket/kioskSession?accessToken=${encodeURIComponent(
      accessToken
    )}`;

    console.log("🔌 WebSocket 연결 시도:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      firstChunkRef.current = true;
    };

    ws.onerror = (e) => console.error("⚠️ WebSocket error:", e);

    ws.onclose = (e) => {
      console.log("❌ WebSocket closed:", e.code, e.reason);
    };

    ws.onmessage = (event) => {
      const data = event.data;

      if (data instanceof ArrayBuffer) {
        pcmPlayer.enqueue(data);
        return;
      }

      try {
        const json = JSON.parse(data);
        console.log("📩 메시지 수신:", json);

        switch (json.messageType) {
          // AI 음성 입력 준비 완료
          case "SERVER_READY":
            setServerReady(true);
            break;

          // 스트리밍 텍스트 청크
          case "OUTPUT_TEXT_CHUNK":
            if (firstChunkRef.current) {
              setText(""); // 첫 chunk에서 기존 문구 삭제
              firstChunkRef.current = false;
            }
            appendText(json.content.text);
            break;

          // 스트리밍 완료 → 최종 텍스트 표시 (딜레이 제거)
          case "OUTPUT_TEXT_RESULT":
            setText(json.content.text);
            break;

          // 장바구니 갱신
          case "UPDATE_SHOPPING_CART":
            setCart(json.content);
            break;

          // 상태 변경 (백엔드 기준 처리)
          case "CHANGE_STATE": {
            const next = json.content.to as State;
            const current = step;

            console.log(`🔄 상태 변경 요청: ${current} → ${next}`);

            if (next !== current) {
              setStep(next);
              firstChunkRef.current = true;
            }
            break;
          }

          default:
            console.warn("⚠️ 알 수 없는 messageType:", json.messageType);
        }
      } catch (err) {
        console.error("❌ JSON 파싱 실패:", err);
      }
    };

    return () => {
      console.log("🔌 WebSocket cleanup");
      ws.close(1000, "Client closed");
      pcmPlayer.stop();
    };
  }, [connect]);

  useEffect(() => {
    if (step === "COMPLETED") {
      console.log("💰 COMPLETED → WebSocket 종료");

      wsRef.current?.close(1000, "Payment complete");
      pcmPlayer.stop();
      setText("✅ 결제가 완료되었습니다.");
    }
  }, [step]);

  return { wsRef, serverReady, pcmPlayer };
};
