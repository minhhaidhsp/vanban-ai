"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square } from "lucide-react";

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

type RecordState = "idle" | "recording";

const MAX_SECONDS = 300;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const BAR_HEIGHTS = [16, 28, 36, 24, 20];
const BAR_DELAYS  = [0, 0.15, 0.3, 0.1, 0.22];

export default function AudioRecorder({ onRecordingComplete, disabled }: Props) {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState("idle");
    setSeconds(0);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
      };

      recorder.start(250);
      setState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) { stopRecording(); return 0; }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[AudioRecorder] getUserMedia error:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const isRecording = state === "recording";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const remaining = MAX_SECONDS - seconds;

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      <style>{`
        @keyframes soundwave {
          from { transform: scaleY(0.3); opacity: 0.6; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>

      {/* Record button */}
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:opacity-40 ${
          isRecording
            ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-200 ring-4 ring-red-200 ring-offset-2"
            : "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-100 hover:shadow-xl hover:shadow-red-200 hover:scale-105 active:scale-95"
        }`}
      >
        {isRecording ? (
          <Square className="h-7 w-7 fill-white text-white" />
        ) : (
          <Mic className="h-7 w-7 text-white" />
        )}
      </button>

      {/* Timer / hint */}
      {isRecording ? (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {pad(mins)}:{pad(secs)}
          </span>
          <span className="text-xs text-muted-foreground">
            Bấm để dừng · còn {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-foreground">Nhấn để ghi âm</span>
          <span className="text-xs text-muted-foreground">Tối đa 5 phút</span>
        </div>
      )}

      {/* Sound wave */}
      {isRecording && (
        <div className="flex items-end gap-1" style={{ height: 44 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="w-2 rounded-full bg-gradient-to-t from-red-500 to-rose-400"
              style={{
                height: h,
                animation: `soundwave 0.65s ease-in-out ${BAR_DELAYS[i]}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
