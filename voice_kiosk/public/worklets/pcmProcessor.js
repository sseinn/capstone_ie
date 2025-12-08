class PcmProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        // 메인 스레드에서 전달된 processorOptions로부터 데이터의 샘플 레이트(24000)를 받음
        this.targetSampleRate = options.processorOptions.targetSampleRate || 24000;

        // 최대 5초 버퍼링
        this.bufferSize = this.targetSampleRate * 10;
        this.buffer = new Float32Array(this.bufferSize);

        this.writeIndex = 0;
        this.readIndex = 0; // Float index for interpolation
        this.availableSamples = 0;

        // 포트 메시지 핸들러
        this.port.onmessage = (e) => {
            const { data } = e;
            const int16 = new Int16Array(data);

            for (let i = 0; i < int16.length; i++) {
                // -1.0 ~ 1.0 변환 및 쓰기
                this.buffer[this.writeIndex] = int16[i] / 0x8000;

                this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
                this.availableSamples++;

                // Overflow 방지 (너무 많이 쌓이면 오래된 데이터 덮어씀 -> readIndex 이동)
                if (this.availableSamples > this.bufferSize) {
                    // readIndex를 한 칸 밀어줌 (정수 단위로 이동)
                    this.readIndex = (this.readIndex + 1) % this.bufferSize;
                    this.availableSamples = this.bufferSize;
                }
            }
        };

        console.log(`🎤 Worklet Initialized. Target Rate: ${this.targetSampleRate}, System Rate: ${sampleRate}`);
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];

        // 시스템 샘플 레이트 (AudioContext)
        const systemRate = sampleRate;

        // Step 계산: 24000(데이터) / 48000(시스템) = 0.5
        // 즉 시스템이 1샘플 진행할 때, 데이터는 0.5샘플만 진행해야 함.
        const step = this.targetSampleRate / systemRate;

        for (let i = 0; i < channel.length; i++) {
            // 보간을 위해 최소 2개의 샘플 간격이 필요하다고 가정하거나, 
            // 단순히 availableSamples가 1 이상이면 읽음.
            // step이 0.5면 2번 읽어야 1개의 데이터 샘플이 소모됨.

            if (this.availableSamples >= 1) {

                // 선형 보간 (Linear Interpolation)
                const index = Math.floor(this.readIndex);
                const nextIndex = (index + 1) % this.bufferSize;
                const fraction = this.readIndex - index;

                const sample1 = this.buffer[index];
                const sample2 = this.buffer[nextIndex];

                // 보간값
                channel[i] = sample1 + (sample2 - sample1) * fraction;

                // readIndex 이동 (소수점 단위)
                this.readIndex += step;

                // 랩어라운드
                if (this.readIndex >= this.bufferSize) {
                    this.readIndex -= this.bufferSize;
                }

                // availableSamples 감소
                // 논리적으로 우리는 'step' 만큼의 데이터 공간을 소비함.
                this.availableSamples -= step;

            } else {
                channel[i] = 0;
                // 데이터가 소진되었을 때, readIndex를 writeIndex(가장 최신 빈곳)로 맞춤?
                // 아니면 그냥 놔둠? 
                // 그냥 놔두면 다음 데이터가 들어왔을 때 이어서 재생됨.
                // 단, availableSamples가 음수가 되지 않도록 보호.
                if (this.availableSamples < 0) this.availableSamples = 0;
            }
        }

        return true;
    }
}

registerProcessor("pcm-processor", PcmProcessor);
