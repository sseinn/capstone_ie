// src/hooks/useKioskSocket.ts
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useKioskStore } from "@/store/kioskStore";
import type { State } from "@/types/step";
import usePcmPlayer from "@/hooks/usePcmPlayer";

type WSMessage = {
  messageType: string;
  content?: Record<string, unknown>;
};

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
  const isCompletedRef = useRef(false);

  const pcmPlayer = usePcmPlayer();

  // 안전한 WebSocket 메시지 전송 함수
  const sendMessage = (msg: WSMessage) => {
    if (!wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify(msg));
    console.log("📤 WebSocket 메시지 전송:", msg);
  };

  useEffect(() => {
    if (!connect || !storeId || !accessToken) return;

    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/stores/${storeId}/websocket/kioskSession?accessToken=${encodeURIComponent(accessToken)}`;

    console.log("🔌 WebSocket 연결 시도:", wsUrl);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      firstChunkRef.current = true;
      isCompletedRef.current = false;
    };

    ws.onerror = (e) => console.error("⚠️ WebSocket error:", e);
    ws.onclose = (e) => console.log("❌ WebSocket closed:", e.code, e.reason);

    ws.onmessage = (event) => {
      const data = event.data;

      // COMPLETED 상태에서는 모든 응답 무시
      if (isCompletedRef.current) return;

      // PCM 처리
      if (data instanceof ArrayBuffer) {
        pcmPlayer.enqueue(data);
        return;
      }

      // JSON 메시지 처리
      try {
        const json = JSON.parse(data);
        console.log("📩 메시지 수신:", json);

        switch (json.messageType) {
          case "SERVER_READY":
            setServerReady(true);
            break;

          case "OUTPUT_TEXT_CHUNK":
            if (firstChunkRef.current) {
              setText("");
              firstChunkRef.current = false;
            }
            appendText(json.content.text);
            break;

          case "OUTPUT_TEXT_RESULT":
            setText(json.content.text);
            break;

          case "UPDATE_SHOPPING_CART":
            setCart(json.content);
            break;

          case "CHANGE_STATE": {
            const next = json.content.to as State;
            console.log(`🔄 상태 변경: ${step} → ${next}`);
            setStep(next);
            firstChunkRef.current = true;

            if (next === "COMPLETED") {
              isCompletedRef.current = true;
              setText("✅ 결제가 완료되었습니다.");

              setTimeout(() => {
                wsRef.current?.close(1000, "Payment complete");
                pcmPlayer.stop();
              }, 3000);
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

    // cleanup
    return () => {
      console.log("🔌 WebSocket cleanup");
      ws.close(1000, "Client closed");
      pcmPlayer.stop();
    };

  }, [connect]); 
  return { wsRef, serverReady, pcmPlayer, sendMessage };
};
