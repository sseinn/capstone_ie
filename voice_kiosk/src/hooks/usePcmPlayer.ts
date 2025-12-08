// src/hooks/usePcmPlayer.ts
import { useRef, useEffect } from "react";

const DEFAULT_SAMPLE_RATE = 24000;
const PCM_WORKLET_PATH = "/worklets/pcmProcessor.js";

export default function usePcmPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isWorkletReadyRef = useRef(false);
  const pendingQueueRef = useRef<ArrayBuffer[]>([]);
  const isResumingRef = useRef(false);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({
        sampleRate: DEFAULT_SAMPLE_RATE,
        latencyHint: "interactive",
      });

      try {
        await audioContextRef.current.audioWorklet.addModule(PCM_WORKLET_PATH);
        console.log("✅ PCM Worklet module loaded.");

        const workletNode = new AudioWorkletNode(audioContextRef.current, "pcm-processor", {
          processorOptions: {
            targetSampleRate: DEFAULT_SAMPLE_RATE,
          }
        });
        workletNode.connect(audioContextRef.current.destination);
        workletNodeRef.current = workletNode;
        isWorkletReadyRef.current = true;

        while (pendingQueueRef.current.length > 0) {
          const buffer = pendingQueueRef.current.shift();
          if (buffer) postToWorklet(buffer);
        }

      } catch (err) {
        console.error("❌ Failed to load PCM worklet:", err);
      }
    }

    // Resume logic with spam protection
    if (audioContextRef.current.state === "suspended" && !isResumingRef.current) {
      isResumingRef.current = true;
      audioContextRef.current.resume().then(() => {
        console.log("🔊 AudioContext Resumed!");
        isResumingRef.current = false;
      }).catch(err => {
        console.error("❌ AudioContext resume error:", err);
        isResumingRef.current = false;
      });
    }
  };

  const start = () => {
    ensureAudioContext();
  };

  const postToWorklet = (buffer: ArrayBuffer) => {
    if (workletNodeRef.current && isWorkletReadyRef.current) {
      // Transferable로 보내거나 복사해서 보냄.
      // 여기서는 slice로 복사본을 보냄 to be safe (if caller needs original)
      workletNodeRef.current.port.postMessage(buffer, [buffer]);
    } else {
      pendingQueueRef.current.push(buffer);
    }
  };

  const enqueue = (buffer: ArrayBuffer) => {
    if (!audioContextRef.current || !isWorkletReadyRef.current) {
      ensureAudioContext();
    }

    // ArrayBuffer를 안전하게 전송하기 위해 slice (Transferable 사용을 위해 새 버퍼 생성)
    // 원본 buffer를 그대로 transfer하면 호출자 쪽에서 에러가 날 수 있음 (만약 재사용한다면).
    // 하지만 보통 WebSocket msg는 1회성이므로 그냥 slice 없이 보내도 되지만,
    // postToWorklet이 Transferable [buffer]를 쓰므로, 안전하게 slice.
    const bufferToSend = buffer.slice(0);
    postToWorklet(bufferToSend);
  };

  const stop = () => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.suspend();
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { enqueue, stop, start };
}