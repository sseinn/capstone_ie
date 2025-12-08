// public/pcm-encoder-processor.js

class PcmEncoderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 현재 AudioContext의 샘플레이트 (보통 48000)
    this.inputSampleRate = sampleRate;
    this.targetSampleRate = 16000;
    this.sampleRateRatio = this.inputSampleRate / this.targetSampleRate;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channelData = input[0]; // 1채널 mono 기준
    if (!channelData) {
      return true;
    }

    const inputLength = channelData.length;
    const sampleRateRatio = this.sampleRateRatio;

    // 다운샘플링 (inputSampleRate → 24000)
    const newLength = Math.floor(inputLength / sampleRateRatio);
    const downsampled = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < newLength) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputLength; i++) {
        accum += channelData[i];
        count++;
      }
      downsampled[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    // Float32 → 16bit Linear PCM (little-endian)
    const buffer = new ArrayBuffer(downsampled.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < downsampled.length; i++) {
      let s = downsampled[i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    // 메인 스레드로 전송 (웹소켓 쪽에서 send)
    this.port.postMessage(buffer, [buffer]);

    return true; // true면 계속 처리
  }
}

registerProcessor("pcm-encoder", PcmEncoderProcessor);
