// src/hooks/useMicStream.ts
import { useEffect, useRef } from "react";

export const useMicStream = (
  wsRef: React.MutableRefObject<WebSocket | null>
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
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
    console.log("🎙️ Audio streaming started (AudioWorklet)");

    // AudioContext가 없거나 닫혀있으면 새로 생성
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    const audioCtx = audioContextRef.current;

    // AudioWorklet 모듈 로드
    try {
      await audioCtx.audioWorklet.addModule("/pcm-encoder-processor.js");
    } catch (e) {
      console.error("❌ AudioWorklet 모듈 로드 실패:", e);
      return;
    }

    const source = audioCtx.createMediaStreamSource(stream);
    // WorkletNode 생성 (이름은 pcm-encoder-processor.js의 registerProcessor 이름과 일치해야 함)
    const workletNode = new AudioWorkletNode(audioCtx, "pcm-encoder");

    workletNode.port.onmessage = (event) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Worklet에서 이미 16bit PCM 변환된 버퍼가 옴
      const pcm16Buffer = event.data;
      wsRef.current.send(pcm16Buffer);
    };

    source.connect(workletNode);
    workletNode.connect(audioCtx.destination);

    workletNodeRef.current = workletNode;
    sourceRef.current = source;
  };

  // 🛑 스트리밍 종료
  const stopStreaming = () => {
    console.log("🛑 Audio streaming stopped");

    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  // cleanup
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return { startStreaming, stopStreaming, initMicPermission };
};