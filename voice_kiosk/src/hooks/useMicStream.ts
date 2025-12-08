// src/hooks/useMicStream.ts

import { useEffect, useRef, useCallback, useState } from "react";



// Web Worker 경로 (PCM 인코딩 담당)

const MIC_WORKER_PATH = "/workers/audioProcessor.js";

// Audio Worklet 파일 경로 (데이터 추출 담당)

const MIC_WORKLET_PATH = "/worklets/micProcessor.js"; 



const TARGET_SAMPLE_RATE = 24000;

const BUFFER_SIZE = 1024; // Worklet 내의 처리 버퍼 크기 (이전 ScriptProcessorNode의 영향을 받지 않음)



export const useMicStream = (

  wsRef: React.MutableRefObject<WebSocket | null>

) => {

  const workerRef = useRef<Worker | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);

  const portRef = useRef<MessagePort | null>(null);

  

  // AudioContext 관련 Ref (메인 스레드에서 관리)

  const audioContextRef = useRef<AudioContext | null>(null);

  // 💡 AudioWorkletNode로 변경

  const workletNodeRef = useRef<AudioWorkletNode | null>(null); 

  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);



  const isRecordingRef = useRef(false); 

  const [isUiRecording, setIsUiRecording] = useState(false);



  const initMicPermission = useCallback(async () => {

    if (mediaStreamRef.current) return;



    try {

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({

        audio: {

          noiseSuppression: true,

          echoCancellation: true,

          autoGainControl: true,

          channelCount: 1,

        },

      });

      console.log("🎙️ 마이크 권한 허용됨");

    } catch (error) {

      console.error("❌ 마이크 접근 오류:", error);

      throw error;

    }

  }, []);

  

  // ----------------------------------------------------

  // 오디오 스트리밍 시작 로직 (AudioWorklet 로드 및 연결)

  // ----------------------------------------------------

  const startStreaming = useCallback(async () => {

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {

      console.warn("⚠️ WebSocket이 아직 열리지 않았습니다. 스트리밍 시작 불가.");

      return;

    }



    try {

      await initMicPermission();

      const stream = mediaStreamRef.current;

      if (!stream) {

        console.error("스트림이 준비되지 않았습니다.");

        return;

      }



      // 1. AudioContext 및 노드 생성 (메인 스레드)

      const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });

      audioContextRef.current = audioContext;



      // 💡 2. AudioWorklet 모듈 로드

      await audioContext.audioWorklet.addModule(MIC_WORKLET_PATH);

      console.log("✅ AudioWorklet module loaded.");

      

      const mediaStreamSource = audioContext.createMediaStreamSource(stream);

      mediaStreamSourceRef.current = mediaStreamSource;



      // 💡 3. AudioWorkletNode 생성

      const workletNode = new AudioWorkletNode(

        audioContext, 

        'mic-processor', // micProcessor.js에 등록된 이름

        {

          processorOptions: {

            bufferSize: BUFFER_SIZE, // Worklet 내부의 처리 크기

            sampleRate: TARGET_SAMPLE_RATE

          }

        }

      );

      workletNodeRef.current = workletNode;



      // 💡 4. Worklet에서 데이터 수신

      workletNode.port.onmessage = (event) => {

        const { type, payload } = event.data;

        if (type === 'AUDIO_CHUNK' && payload instanceof ArrayBuffer) {

          // Worklet에서 받은 Float32Array 데이터를 기존 Web Worker로 전달 (PCM 변환 위임)

          portRef.current?.postMessage({ 

            command: 'PROCESS_CHUNK', 

            payload: payload 

          }, [payload]); // Transferable Objects 사용

        }

      };



      // 5. 연결: Source -> WorkletNode -> Destination

      mediaStreamSource.connect(workletNode);

      // WorkletNode를 destination에 연결해야 Worklet이 작동하기 시작합니다.

      workletNode.connect(audioContext.destination); 



      // 💡 상태 업데이트

      isRecordingRef.current = true;

      setIsUiRecording(true); 

      console.log("🎙️ Main: Audio streaming started via AudioWorklet.");



    } catch (error) {

      console.error("스트리밍 시작 중 오류 (AudioWorklet 로드 실패 가능성):", error);

    }

  }, [wsRef, initMicPermission]);



  // ----------------------------------------------------

  // 오디오 스트리밍 중지 로직

  // ----------------------------------------------------

  const stopStreaming = useCallback(() => {

    console.log("🛑 Audio streaming stopped by main thread");

    

    // 1. AudioWorkletNode 해제

    if (workletNodeRef.current) {

        workletNodeRef.current.disconnect();

        workletNodeRef.current.port.onmessage = null;

        workletNodeRef.current = null;

    }

    if (mediaStreamSourceRef.current) {

        mediaStreamSourceRef.current.disconnect();

        mediaStreamSourceRef.current = null;

    }

    if (audioContextRef.current) {

        audioContextRef.current.close().then(() => {

            audioContextRef.current = null;

        });

    }



    // 2. 마이크 트랙 중지

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    mediaStreamRef.current = null;

    

    // 💡 상태 업데이트

    isRecordingRef.current = false;

    setIsUiRecording(false);

  }, []);



  // ----------------------------------------------------

  // Web Worker 초기화 및 통신 설정 (PCM 전송 로직 유지)

  // ----------------------------------------------------

  useEffect(() => {

    // ... (기존 Web Worker 초기화 및 MessageChannel 로직 유지)

    const worker = new Worker(MIC_WORKER_PATH);

    workerRef.current = worker;



    const channel = new MessageChannel();

    portRef.current = channel.port1;

    

    // Worker로부터 변환된 PCM 데이터를 수신

    channel.port1.onmessage = (event) => {

      const { type, payload } = event.data;

      

      if (type === 'PCM_CHUNK' && payload instanceof ArrayBuffer) {

        // 💡 Ref를 사용하여 최신 녹음 상태를 확인

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isRecordingRef.current) {

          wsRef.current.send(payload); 

        }

      } else if (type === 'ERROR') {

        console.error("❌ Worker Error:", payload);

      }

    };



    // Worker 초기화 및 Port2 전달

    worker.postMessage({ command: 'INIT_PORT', port: channel.port2 }, [channel.port2]);



    return () => {

      stopStreaming();

      worker.terminate();

      portRef.current?.close();

    };

  }, [stopStreaming, wsRef]); 



  return { startStreaming, stopStreaming, initMicPermission, isRecording: isUiRecording };

};