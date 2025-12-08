// src/hooks/usePcmPlayer.ts
import { useRef } from "react";

const DEFAULT_SAMPLE_RATE = 24000; 

export default function usePcmPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef(0);

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      // AudioContext 생성 시 샘플 레이트 설정
      audioContextRef.current = new AudioContext({
        sampleRate: DEFAULT_SAMPLE_RATE,
      });
    } 
    if (audioContextRef.current.state === "suspended") {
      // 사용자의 상호작용 후 resume (자동 재생 방지 해결)
      audioContextRef.current.resume().then(() => {
          console.log("🔊 AudioContext Resumed!");
      }).catch(err => {
          console.error("❌ AudioContext resume error:", err);
      });
    }
  };

  // AudioContext 활성화를 위한 외부 노출 함수 (사용자 상호작용 필요)
  const start = () => {
      ensureAudioContext();
  };

  const convertToFloat32 = (buffer: ArrayBuffer) => {
    const dataView = new DataView(buffer);
    // 16비트 정수(Int16)를 부동 소수점(Float32)으로 변환
    const float32 = new Float32Array(buffer.byteLength / 2);

    for (let i = 0; i < float32.length; i++) {
      // Int16 값을 -1.0 ~ 1.0 범위의 Float32로 정규화
      float32[i] = dataView.getInt16(i * 2, true) / 0x8000;
    }
    return float32;
  };

  const enqueue = (buffer: ArrayBuffer, sampleRate: number = DEFAULT_SAMPLE_RATE) => {
    ensureAudioContext();

    const audioCtx = audioContextRef.current!;
    const pcm = convertToFloat32(buffer);

    const audioBuffer = audioCtx.createBuffer(1, pcm.length, sampleRate);
    audioBuffer.getChannelData(0).set(pcm);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    // 이전 오디오가 끝나는 시점 또는 현재 시점 중 늦은 시점에 재생 시작 (큐잉)
    const startAt = Math.max(lastPlayTimeRef.current, now);

    source.start(startAt);
    lastPlayTimeRef.current = startAt + audioBuffer.duration;
  };

  const stop = () => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.suspend(); 
      lastPlayTimeRef.current = 0;
    }
  };

  return { enqueue, stop, start }; 
}