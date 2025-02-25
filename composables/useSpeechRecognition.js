import { ref } from "vue";

export function useSpeechRecognition() {
    const transcript = ref("");
    const isListening = ref(false);

    let recognition = null;

    // 仅在浏览器端运行
    if (process.client) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false; // 识别到一句就停止
            recognition.interimResults = false; // 关闭中间结果
            recognition.lang = "en-US"; // 设定识别语言

            recognition.onstart = () => {
                isListening.value = true;
            };

            recognition.onend = () => {
                isListening.value = false;
            };

            recognition.onresult = (event) => {
                const lastResult = event.results[event.results.length - 1][0].transcript;
                transcript.value = lastResult;
            };
        } else {
            console.warn("Your browser does not support Speech Recognition.");
        }
    }

    const startListening = () => {
        if (recognition) {
            recognition.start();
        } else {
            console.error("SpeechRecognition is not supported.");
        }
    };

    const stopListening = () => {
        if (recognition) {
            recognition.stop();
        }
    };

    return { transcript, isListening, startListening, stopListening };
}