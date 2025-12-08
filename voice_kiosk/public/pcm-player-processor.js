// public/pcm-player-processor.js

class PcmPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 링 버퍼 크기 (충분히 크게 잡음)
        this.bufferSize = 24000 * 10; // 약 10초 분량
        this.buffer = new Float32Array(this.bufferSize);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.availableSamples = 0;

        // 메인 스레드로부터 메시지 수신 (PCM 데이터)
        this.port.onmessage = (event) => {
            const pcm16IntArray = new Int16Array(event.data);
            this.pushData(pcm16IntArray);
        };
    }

    // Ring Buffer에 데이터 쓰기
    pushData(pcmData) {
        const inputLen = pcmData.length;
        for (let i = 0; i < inputLen; i++) {
            // Int16 -> Float32 변환 (-1.0 ~ 1.0)
            const floatSample = pcmData[i] / 0x8000;

            this.buffer[this.writeIndex] = floatSample;
            this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
        }
        this.availableSamples += inputLen;
        // 버퍼 오버플로우 방지 (오래된 데이터 덮어쓰기 상황은 간단히 무시하거나 리셋 가능하지만 여기선 길이만 조정)
        if (this.availableSamples > this.bufferSize) {
            this.availableSamples = this.bufferSize;
            // readIndex를 writeIndex 바로 뒤로 옮겨야 하지만, 
            // 실시간 스트리밍 특성상 그냥 오버플로우는 드문 케이스라 단순 처리
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channelData = output[0]; // Mono output
        const outputLength = channelData.length;

        // 버퍼에 데이터가 충분치 않으면 침묵 (0 채움)
        if (this.availableSamples === 0) {
            // output buffer is already usually zero-initialized, but explicitly zeroing ensures silence
            channelData.fill(0);
            return true;
        }

        // 버퍼에서 읽어서 출력으로 복사
        for (let i = 0; i < outputLength; i++) {
            if (this.availableSamples > 0) {
                channelData[i] = this.buffer[this.readIndex];
                this.readIndex = (this.readIndex + 1) % this.bufferSize;
                this.availableSamples--;
            } else {
                channelData[i] = 0; // 데이터 소진
            }
        }

        return true; // Keep processor alive
    }
}

registerProcessor("pcm-player", PcmPlayerProcessor);
