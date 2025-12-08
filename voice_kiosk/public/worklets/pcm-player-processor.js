// public/worklets/pcm-player-processor.js

/**
 * AudioWorkletProcessor: 서버에서 수신된 16-bit PCM 데이터를 버퍼링하고 재생합니다.
 */
class PcmPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferQueue = []; // PCM 데이터를 저장할 재생 큐
        this.port.onmessage = this.handleMessage.bind(this);
    }

    // 메인 스레드로부터 PCM 데이터(ArrayBuffer)를 수신
    handleMessage(event) {
        const { type, payload } = event.data;

        if (type === 'PCM_CHUNK' && payload instanceof ArrayBuffer) {
            // 수신된 16비트 데이터를 Float32Array로 변환하여 큐에 추가
            const int16Array = new Int16Array(payload);
            const float32Array = new Float32Array(int16Array.length);
            
            // 16비트 정수를 -1.0 ~ 1.0 범위의 Float32로 정규화
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0; 
            }
            
            this.bufferQueue.push(float32Array);
        } else if (type === 'STOP') {
            this.bufferQueue = []; // 재생 즉시 중지
        }
    }

    // 오디오 스레드에서 주기적으로 호출되어 오디오 데이터를 출력
    process(inputs, outputs, parameters) {
        const outputChannel = outputs[0][0]; 
        
        // 출력 버퍼의 크기 (일반적으로 128)
        const outputLength = outputChannel.length; 

        if (this.bufferQueue.length === 0) {
            // 재생할 데이터가 없으면 무음(0)으로 채움
            outputChannel.fill(0);
            return true;
        }

        // 큐의 첫 번째 버퍼를 가져와서 사용
        let currentBuffer = this.bufferQueue[0];
        let copied = 0;

        // 출력 버퍼를 채울 때까지 큐의 데이터를 복사
        while (copied < outputLength && this.bufferQueue.length > 0) {
            currentBuffer = this.bufferQueue[0];
            const remaining = currentBuffer.length - copied;
            const copySize = Math.min(outputLength - copied, remaining);
            
            // 데이터 복사
            outputChannel.set(currentBuffer.subarray(copied, copied + copySize), copied);

            copied += copySize;

            if (copied >= currentBuffer.length) {
                // 현재 버퍼를 다 사용했으면 큐에서 제거하고 다음 버퍼로 이동
                this.bufferQueue.shift();
                copied = 0; // 다음 큐의 시작은 0부터 복사해야 함
                
                // 버퍼를 다 썼지만 출력 버퍼를 다 채우지 못했다면 다음 큐 항목으로 계속 채움
            }
        }
        
        // 출력 버퍼가 남는 경우 무음으로 채움
        if (copied < outputLength) {
             outputChannel.fill(0, copied);
        }
        
        return true;
    }
}

registerProcessor('pcm-player-processor', PcmPlayerProcessor);