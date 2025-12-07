// src/hooks/usePcmPlayer.ts
import { useRef } from "react";

export default function usePcmPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // 🎧 오디오 컨텍스트 초기화 (24kHz 강제)
  function ensureAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
  }

  // 🔊 PCM 데이터 큐에 추가
  function enqueue(arrayBuffer: ArrayBuffer) {
    ensureAudioContext();

    const dataView = new DataView(arrayBuffer);
    const sampleCount = arrayBuffer.byteLength / 2; // 16bit
    const floatData = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      floatData[i] = int16 / 32768;
    }

    queueRef.current.push(floatData);

    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      playQueue();
    }
  }

  // ▶ 재생 처리
  function playQueue() {
    ensureAudioContext();
    const audioCtx = audioContextRef.current!;
    const queue = queueRef.current;

    if (queue.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const pcm = queue.shift()!;
    const audioBuffer = audioCtx.createBuffer(1, pcm.length, 24000); // mono, 24kHz
    audioBuffer.getChannelData(0).set(pcm);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    source.onended = playQueue;
    source.start();
  }

  // ⛔ 정리
  function stop() {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    queueRef.current = [];
    isPlayingRef.current = false;
  }

  return { enqueue, stop };
}
