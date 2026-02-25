"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Universal Voice Input Component
 * - Works in ALL browsers (Chrome, Firefox, Safari, Edge)
 * - Auto language detection (Hindi vs English)
 * - Auto-send option
 * - Real-time transcription display
 * - Fallback to backend transcription if Web Speech API unavailable
 */
export function VoiceInput({
    onTranscript,
    onError,
    autoSend = false,
    showLanguage = true
}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [detectedLanguage, setDetectedLanguage] = useState("");
    const [supportsWebSpeech, setSupportsWebSpeech] = useState(false);
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Check browser support on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            setSupportsWebSpeech(!!SpeechRecognition);

            if (SpeechRecognition) {
                setupWebSpeechAPI();
            }
        }
    }, []);

    // Setup Web Speech API (Chrome, Edge, Safari)
    const setupWebSpeechAPI = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Configure for best results
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Auto-detect language (works in Chrome)
        recognition.lang = navigator.language || "en-US";

        recognition.onstart = () => {
            console.log("Voice recognition started");
            setIsListening(true);
            setTranscript("");
            setDetectedLanguage("");
        };

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptText = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcriptText + " ";
                } else {
                    interimTranscript += transcriptText;
                }
            }

            // Show real-time transcription
            const currentTranscript = finalTranscript || interimTranscript;
            setTranscript(currentTranscript);

            // Detect language when we have final transcript
            if (finalTranscript) {
                const lang = detectLanguage(finalTranscript);
                setDetectedLanguage(lang);

                // Send transcript to parent
                onTranscript(finalTranscript.trim(), lang);

                // Auto-send if enabled
                if (autoSend) {
                    // Small delay to show the transcript
                    setTimeout(() => {
                        const event = new CustomEvent('voice-auto-send', {
                            detail: { text: finalTranscript.trim(), language: lang }
                        });
                        window.dispatchEvent(event);
                    }, 300);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);

            if (event.error === 'not-allowed') {
                onError?.("Microphone access denied. Please allow microphone access.");
            } else if (event.error === 'no-speech') {
                onError?.("No speech detected. Please try again.");
            } else {
                onError?.(event.error);
            }
        };

        recognition.onend = () => {
            console.log("Voice recognition ended");
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    };

    // Language detection function
    const detectLanguage = (text) => {
        // Check for Devanagari script (Hindi)
        const devanagariRegex = /[\u0900-\u097F]/;
        if (devanagariRegex.test(text)) {
            return "hi"; // Hindi
        }

        // Check for common Hindi words in Roman script
        const hindiRomanWords = /\b(kya|hai|hoon|hain|ka|ki|ke|main|aap|tum|yeh|woh|kaise|kahan|kab|kyun)\b/i;
        if (hindiRomanWords.test(text)) {
            return "hi"; // Roman Hindi
        }

        // Default to English
        return "en";
    };

    // Fallback: Use MediaRecorder + Backend Transcription (Firefox, older browsers)
    const startMediaRecorder = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                chunksRef.current = [];

                try {
                    // Send to backend for transcription
                    const result = await transcribeAudioBackend(audioBlob);

                    const lang = detectLanguage(result.transcript);
                    setDetectedLanguage(lang);
                    setTranscript(result.transcript);

                    onTranscript(result.transcript, lang);

                    if (autoSend) {
                        setTimeout(() => {
                            const event = new CustomEvent('voice-auto-send', {
                                detail: { text: result.transcript, language: lang }
                            });
                            window.dispatchEvent(event);
                        }, 300);
                    }
                } catch (error) {
                    console.error("Transcription error:", error);
                    onError?.("Failed to transcribe audio. Please try again.");
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                setIsListening(false);
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsListening(true);
            setTranscript("🎤 Recording...");

        } catch (error) {
            console.error("Microphone error:", error);
            onError?.("Could not access microphone. Please check permissions.");
            setIsListening(false);
        }
    };

    // Backend transcription API call
    const transcribeAudioBackend = async (audioBlob) => {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe`, {
            method: "POST",
            body: formData,
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (!response.ok) {
            throw new Error("Transcription failed");
        }

        return await response.json();
    };

    // Start listening
    const startListening = () => {
        if (supportsWebSpeech && recognitionRef.current) {
            // Use Web Speech API
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Failed to start recognition:", error);
                // Fallback to MediaRecorder
                startMediaRecorder();
            }
        } else {
            // Use MediaRecorder + backend
            startMediaRecorder();
        }
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current && supportsWebSpeech) {
            recognitionRef.current.stop();
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }

        setIsListening(false);
    };

    // Toggle listening
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Voice button */}
            <button
                onClick={toggleListening}
                type="button"
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "none",
                    background: isListening
                        ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        : "rgba(124,58,237,0.2)",
                    color: isListening ? "#fff" : "#a78bfa",
                    fontSize: 18,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    animation: isListening ? "pulse 1.5s infinite" : "none",
                }}
                title={isListening ? "Stop listening" : "Start voice input"}
            >
                {isListening ? "🔴" : "🎤"}
            </button>

            {/* Real-time transcript display */}
            {transcript && (
                <div style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    fontSize: 13,
                    color: "#a78bfa",
                    maxWidth: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}>
                    {transcript}
                </div>
            )}

            {/* Language indicator */}
            {showLanguage && detectedLanguage && (
                <div style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: detectedLanguage === "hi" ? "rgba(251,191,36,0.2)" : "rgba(59,130,246,0.2)",
                    border: `1px solid ${detectedLanguage === "hi" ? "rgba(251,191,36,0.4)" : "rgba(59,130,246,0.4)"}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: detectedLanguage === "hi" ? "#fbbf24" : "#60a5fa",
                    textTransform: "uppercase",
                }}>
                    {detectedLanguage === "hi" ? "हिंदी" : "EN"}
                </div>
            )}

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); 
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); 
            transform: scale(1.05);
          }
        }
      `}</style>
        </div>
    );
}

// Compact version (just the button)
export function CompactVoiceInput({ onTranscript, autoSend = false }) {
    const [isListening, setIsListening] = useState(false);

    const handleTranscript = (text, language) => {
        onTranscript(text, language);
    };

    return (
        <VoiceInput
            onTranscript={handleTranscript}
            autoSend={autoSend}
            showLanguage={false}
            onError={(err) => console.error(err)}
        />
    );
}

// Export for use in chat
export default VoiceInput;
