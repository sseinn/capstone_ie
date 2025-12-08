// src/hooks/usePcmPlayer.ts
import { useRef } from "react";

export default function usePcmPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const initAudio = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({
        sampleRate: 24000
      });
    } else if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    const audioCtx = audioContextRef.current;

    // 이미 워크렛이 로드되어 있지 않다면 로드
    if (!workletNodeRef.current) {
      try {
        await audioCtx.audioWorklet.addModule("/pcm-player-processor.js");
        const node = new AudioWorkletNode(audioCtx, "pcm-player");
        node.connect(audioCtx.destination);
        workletNodeRef.current = node;
      } catch (e) {
        console.error("❌ PCM Player Worklet 로드 실패:", e);
      }
    }
  };

  const enqueue = async (buffer: ArrayBuffer) => {
    await initAudio(); // 오디오 컨텍스트 및 워크렛 준비

    if (workletNodeRef.current) {
      // 메인 스레드는 데이터를 오디오 스레드로 "던지기"만 함 (Copy-Free에 가깝게 동작)
      workletNodeRef.current.port.postMessage(buffer);
    }
  };

  const stop = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  return { enqueue, stop };
}