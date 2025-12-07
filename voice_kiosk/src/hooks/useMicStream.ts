// src/hooks/useMicStream.ts
import { useEffect, useRef } from "react";

export const useMicStream = (
  wsRef: React.MutableRefObject<WebSocket | null>
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // 🎙️ 마이크 권한 + 잡음 제거 옵션 적용
  const initMicPermission = async () => {
    if (!mediaStreamRef.current) {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,      // 🔥 환경 소음 제거
          echoCancellation: true,      // 🔥 반향 제거
          autoGainControl: true,       // 🔥 자동 음량 조절
          channelCount: 1
        }
      });
      console.log("🎙️ 마이크 권한 허용됨 (노이즈 제거 적용됨)");
    }
  };

  // 🎧 음성 스트리밍 시작
  const startStreaming = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ WebSocket이 아직 열리지 않았습니다.");
      return;
    }

    await initMicPermission();

    const stream = mediaStreamRef.current!;
    console.log("🎙️ Audio streaming started");

    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    const audioCtx = audioContextRef.current;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0); // Float32Array (24kHz)
      const pcm16 = floatTo16BitPCM(input);

      wsRef.current.send(pcm16);
    };

    processorRef.current = processor;
    sourceRef.current = source;
  };

  // 🛑 스트리밍 종료
  const stopStreaming = () => {
    console.log("🛑 Audio streaming stopped");

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  // 🔉 Float32Array → 16bit PCM 변환
  function floatTo16BitPCM(float32Array: Float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  // cleanup
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return { startStreaming, stopStreaming, initMicPermission };
};
