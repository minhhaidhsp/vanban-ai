import { api } from "../api";

export interface TranscribeResult {
  transcript: string;
  language: string;
  filename: string;
  error?: string;
}

export interface Language {
  code: string;
  name: string;
}

export const sttApi = {
  transcribeFile: async (
    file: File,
    language: string
  ): Promise<TranscribeResult> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(
      `/stt/transcribe?language=${encodeURIComponent(language)}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data as TranscribeResult;
  },

  transcribeBlob: async (
    blob: Blob,
    language: string
  ): Promise<TranscribeResult> => {
    const form = new FormData();
    form.append("audio_blob", blob, "recording.webm");
    const { data } = await api.post(
      `/stt/transcribe-realtime?language=${encodeURIComponent(language)}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data as TranscribeResult;
  },

  getLanguages: async (): Promise<Language[]> => {
    const { data } = await api.get("/stt/languages");
    return data as Language[];
  },
};
