// public/worklets/micProcessor.js

/**
 * AudioWorkletProcessor:
 * 오디오 전용 스레드에서 실행되며 마이크 데이터를 안정적으로 추출하여 메인 스레드로 전달합니다.
 * 이 코드는 메인 스레드 간섭 없이 안정적인 오디오 스트리밍을 보장합니다.
 */
class MicProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // useMicStream.ts에서 전달된 processorOptions를 사용하여 버퍼 크기 설정
        this.bufferSize = options.processorOptions.bufferSize || 1024;
        
        // 현재 오디오 데이터를 일시적으로 저장할 버퍼
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // 디버깅 및 확인을 위한 메시지
        console.log(`🎤 Worklet: Initialized with bufferSize: ${this.bufferSize}`);
    }

    /**
     * 오디오 처리를 위한 핵심 메서드. 오디오 처리 스레드에서 주기적으로 호출됨.
     * @param {Float32Array[][]} inputs - 입력 오디오 데이터 (채널 수, 샘플 수)
     * @param {Float32Array[][]} outputs - 출력 오디오 데이터
     * @returns {boolean} true를 반환하면 Worklet 노드를 계속 활성 상태로 유지
     */
    process(inputs, outputs, parameters) {
        // 첫 번째 입력 포트의 첫 번째 채널만 사용합니다 (모노 마이크 입력 가정).
        const inputChannel = inputs[0][0]; 

        // 입력 데이터가 없거나 0이라면 처리를 중단합니다.
        if (!inputChannel || inputChannel.length === 0) {
            return true;
        }

        // inputChannel.length는 AudioWorklet의 기본 청크 크기인 128 샘플입니다.
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];
            
            // 버퍼가 목표 크기(1024)에 도달하면 메인 스레드로 전송합니다.
            if (this.bufferIndex >= this.bufferSize) {
                
                // ArrayBuffer를 Transferable Object로 전송하여 복사 비용 최소화
                // (this.buffer의 소유권이 메인 스레드로 넘어갑니다.)
                this.port.postMessage({
                    type: 'AUDIO_CHUNK',
                    payload: this.buffer.buffer // ArrayBuffer 전송
                }, [this.buffer.buffer]);

                // 다음 처리를 위해 새 Float32Array 버퍼를 생성해야 합니다.
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
            }
        }
        
        // Worklet 노드를 계속 활성 상태로 유지해야 마이크 데이터를 지속적으로 받습니다.
        return true; 
    }
}

// Worklet 프로세서를 등록합니다. 이 이름('mic-processor')은 useMicStream.ts에서 사용됩니다.
registerProcessor('mic-processor', MicProcessor);