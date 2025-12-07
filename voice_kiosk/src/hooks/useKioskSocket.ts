// src/hooks/useKioskSocket.ts
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useKioskStore } from "@/store/kioskStore";
import type { State } from "@/types/step";
import usePcmPlayer from "@/hooks/usePcmPlayer";

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

  // COMPLETED 상태인지 체크 (PCM 무시용)
  const isCompletedRef = useRef(false);

  // COMPLETED에서 소켓 종료 타이머
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!connect || !storeId || !accessToken) return;

    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/stores/${storeId}/websocket/kioskSession?accessToken=${encodeURIComponent(
      accessToken
    )}`;

    console.log("🔌 WebSocket 연결 시도:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

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

      /** 🔊 PCM 스트리밍 처리 */
      if (data instanceof ArrayBuffer) {
        // COMPLETED 에서는 PCM 무시
        if (!isCompletedRef.current) {
          pcmPlayer.enqueue(data);
        }
        return;
      }

      /** 🔤 JSON 메시지 처리 */
      try {
        const json = JSON.parse(data);
        console.log("📩 메시지 수신:", json);

        switch (json.messageType) {
          case "SERVER_READY":
            setServerReady(true);
            break;

          case "OUTPUT_TEXT_CHUNK":
            if (!isCompletedRef.current) {
              if (firstChunkRef.current) {
                setText("");
                firstChunkRef.current = false;
              }
              appendText(json.content.text);
            }
            break;

          case "OUTPUT_TEXT_RESULT":
            if (!isCompletedRef.current) {
              setText(json.content.text);
            }
            break;

          case "UPDATE_SHOPPING_CART":
            setCart(json.content);
            break;

          case "CHANGE_STATE": {
            const next = json.content.to as State;
            const current = step;

            console.log(`🔄 상태 변경: ${current} → ${next}`);

            setStep(next);
            firstChunkRef.current = true;

            // COMPLETED 진입 시 PCM 즉시 차단 + 완료 문구 표시
            if (next === "COMPLETED") {
              console.log("🎉 COMPLETED 진입 → PCM 차단 + UI 문구 표시");

              isCompletedRef.current = true;
              pcmPlayer.stop();

              // UI 문구 바로 표시
              setText("🧾 주문해주셔서 감사합니다.");

              // 백엔드 마지막 메시지 여유시간(딜레이 없음)
              if (completeTimeoutRef.current)
                clearTimeout(completeTimeoutRef.current);

              completeTimeoutRef.current = setTimeout(() => {
                wsRef.current?.close(1000, "Payment complete");
              }, 300);
            }

            break;
          }

          default:
            console.warn("⚠️ Unknown messageType:", json.messageType);
        }
      } catch (err) {
        console.error("❌ JSON parse error:", err);
      }
    };

    return () => {
      console.log("🔌 WebSocket cleanup");
      ws.close(1000, "Client closed");
      pcmPlayer.stop();
    };
  }, [connect]);

  return { wsRef, serverReady, pcmPlayer };
};
