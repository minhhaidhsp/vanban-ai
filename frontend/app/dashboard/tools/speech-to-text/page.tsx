"use client";

import { useState, useRef } from "react";
import { Mic, Upload, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sttApi } from "@/lib/api/stt";
import LanguageSelector from "@/components/tools/stt/LanguageSelector";
import AudioRecorder from "@/components/tools/stt/AudioRecorder";
import TranscriptEditor from "@/components/tools/stt/TranscriptEditor";

type InputTab = "record" | "upload";

export default function SpeechToTextPage() {
  const [language, setLanguage] = useState("vi");
  const [activeTab, setActiveTab] = useState<InputTab>("record");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setLoading(true);
    setError("");
    try {
      const result = await sttApi.transcribeBlob(blob, language);
      if (result.error) setError(result.error);
      else setTranscript(result.transcript);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Lỗi khi nhận dạng âm thanh."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    setError("");
  };

  const handleTranscribeFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    try {
      const result = await sttApi.transcribeFile(selectedFile, language);
      if (result.error) setError(result.error);
      else setTranscript(result.transcript);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Lỗi khi nhận dạng file."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInsertToEditor = async () => {
    await navigator.clipboard.writeText(transcript);
    showToast("Đã sao chép! Paste vào editor để chèn nội dung.");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setSelectedFile(f); setError(""); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Chuyển âm thanh thành văn bản</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-destructive/60 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Section 1 — Input */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ngôn ngữ
          </span>
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(["record", "upload"] as InputTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "record" ? "🎙️ Ghi âm" : "📁 Tải file lên"}
            </button>
          ))}
        </div>

        {activeTab === "record" && (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={loading}
          />
        )}

        {activeTab === "upload" && (
          <div className="space-y-3 pt-1">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-12 cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              {selectedFile ? (
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Kéo thả hoặc bấm để chọn file
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    MP3 · MP4 · M4A · WAV · WebM · OGG — tối đa 25MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.mp4,.m4a,.mpeg,.mpga,.wav,.webm,.ogg"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <Button
              onClick={handleTranscribeFile}
              disabled={!selectedFile || loading}
              className="w-full h-10"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Đang nhận dạng..." : "Chuyển đổi"}
            </Button>
          </div>
        )}
      </div>

      {/* Section 2 — Output */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Kết quả
        </p>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-sm">Đang nhận dạng...</span>
          </div>
        ) : (
          <TranscriptEditor
            transcript={transcript}
            onChange={setTranscript}
            onInsertToEditor={handleInsertToEditor}
          />
        )}
      </div>

      {/* Toast — fixed bottom-right */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg text-sm text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
