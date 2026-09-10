import React, { useState, useEffect, useRef } from "react";
import { getGeminiAI } from "../../lib/gemini";
import { LiveServerMessage, Modality } from "@google/genai";

export default function VoiceApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startRecording = async () => {
    try {
      const ai = getGeminiAI();

      audioContextRef.current = new window.AudioContext({ sampleRate: 16000 });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const source = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      sessionRef.current = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsRecording(true);
            setTranscript((prev) => [
              ...prev,
              "System: Connected to AI Voice Assistant",
            ]);

            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
              }

              const base64Data = btoa(
                String.fromCharCode(...new Uint8Array(pcm16.buffer)),
              );

              sessionRef.current.then((session: any) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              const audioBuffer =
                await audioContextRef.current!.decodeAudioData(bytes.buffer);
              const sourceNode = audioContextRef.current!.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(audioContextRef.current!.destination);
              sourceNode.start();
            }
          },
          onerror: (err: any) => {
            console.error(err);
            setTranscript((prev) => [...prev, "System: Error occurred"]);
            stopRecording();
          },
          onclose: () => {
            setTranscript((prev) => [...prev, "System: Disconnected"]);
            stopRecording();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "You are a helpful school assistant for Agaram Dhines Academy.",
        },
      });
    } catch (error) {
      console.error(error);
      alert(
        "Failed to start recording. Please check microphone permissions and API key.",
      );
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    setIsRecording(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        AI Voice Assistant
      </h2>
      <p className="text-gray-600 mb-6">
        Powered by Gemini 2.5 Native Audio. Have a real-time conversation with
        the academy assistant.
      </p>

      <div className="flex flex-col items-center justify-center space-y-8 py-12">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg
            ${isRecording ? "bg-red-500 animate-pulse scale-110" : "bg-[#1e3a8a] hover:bg-blue-800"}`}
        >
          {isRecording ? (
            <span className="text-xl font-bold">Stop</span>
          ) : (
            <span className="text-xl font-bold">Start</span>
          )}
        </button>

        <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto border border-gray-200">
          {transcript.length === 0 ? (
            <p className="text-gray-400 text-center italic mt-20">
              System logs will appear here...
            </p>
          ) : (
            <ul className="space-y-2">
              {transcript.map((msg, idx) => (
                <li key={idx} className="text-sm text-gray-700 font-mono">
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
