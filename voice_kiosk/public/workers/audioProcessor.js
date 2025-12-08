// public/workers/audioProcessor.js

/**
 * 메인 스레드로부터 Float32Array를 받아 16-bit PCM으로 변환 후 반환하는 Web Worker
 */

let channelPort = null; // 메인 스레드와 통신할 MessagePort

/**
 * 16-bit PCM (Signed short)으로 변환하는 함수
 * @param {Float32Array} input - Float32Array 형식의 오디오 데이터
 * @returns {Int16Array} 16-bit PCM 데이터
 */
function floatTo16BitPCM(input) {
    // Int16Array를 생성할 때 input.length * 2 바이트의 ArrayBuffer가 필요
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]));
        // -1.0 ~ 1.0 범위의 Float을 Int16 범위 (-32768 ~ 32767)로 변환
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

// Worker가 메시지를 받을 때 실행되는 리스너
self.onmessage = (event) => {
    const { command, port } = event.data;

    if (command === 'INIT_PORT' && port) {
        // MessageChannel의 Port2를 전달받아 통신 채널 설정
        channelPort = port;
        console.log("⚙️ Worker: MessagePort initialized.");
        
        // 포트를 통해 메시지를 받는 리스너 설정
        channelPort.onmessage = (portEvent) => {
            const { command: portCommand, payload } = portEvent.data;
            
            if (portCommand === 'PROCESS_CHUNK' && payload instanceof ArrayBuffer) {
                try {
                    // ArrayBuffer를 Float32Array로 변환
                    const inputData = new Float32Array(payload);
                    
                    // PCM 변환 수행 (무거운 작업)
                    const pcmData = floatTo16BitPCM(inputData);
                    
                    // PCM 데이터를 Transferable Objects로 메인 스레드에 반환
                    if (channelPort) {
                        channelPort.postMessage({ 
                            type: 'PCM_CHUNK', 
                            payload: pcmData.buffer 
                        }, [pcmData.buffer]);
                    }
                } catch (error) {
                    console.error("❌ Worker: Error processing chunk:", error);
                    channelPort?.postMessage({ type: 'ERROR', payload: error.message });
                }
            }
        };
    }
};