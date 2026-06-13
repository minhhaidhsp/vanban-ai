import axios from "axios";
import Cookies from "js-cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data as { access_token: string; token_type: string };
  },

  register: async (full_name: string, email: string, password: string) => {
    const { data } = await api.post("/auth/register", { full_name, email, password });
    return data;
  },

  me: async () => {
    const { data } = await api.get("/users/me");
    return data;
  },
};

export const organizationApi = {
  getCurrent: async () => {
    const { data } = await api.get("/organizations/current");
    return data as {
      ten_chu_quan: string;
      ten_co_quan: string;
      viet_tat: string;
      dia_danh: string;
      chu_ky_mac_dinh: { quyen_han?: string; ten_tap_the?: string; chuc_vu?: string };
    };
  },
};

export const recipientApi = {
  search: async (q: string) => {
    const { data } = await api.get("/recipient-suggestions/", { params: { q } });
    return data as { id: string; name: string }[];
  },
  increment: async (name: string) => {
    await api.post("/recipient-suggestions/increment", null, { params: { name } });
  },
};

export interface RefDoc {
  id: string;
  title: string;
  loai_van_ban: string;
  so_ki_hieu: string;
  ngay_ban_hanh: string | null;
  co_quan_ban_hanh: string;
  nguoi_ky: string | null;
  trich_yeu: string;
  hieu_luc: string;
  visibility: "private" | "org" | "system";
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  tom_tat: string | null;
  tu_khoa: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  download_url: string | null;
  chunk_count?: number | null;
}

export interface RefDocListResponse {
  items: RefDoc[];
  total: number;
  skip: number;
  limit: number;
}

export interface MetadataPreviewResponse {
  doc_id: string;
  status: "ready" | "processing" | "not_available";
  fields: {
    so_ki_hieu: string | null;
    ngay_ban_hanh: string | null;
    co_quan_ban_hanh: string | null;
    nguoi_ky: string | null;
    trich_yeu: string | null;
    hieu_luc: string | null;
    tom_tat: string | null;
    can_cu: string[];
  } | null;
  confidence: Record<string, "high" | "medium" | "low" | "unknown"> | null;
}

export interface MetadataConfirmRequest {
  so_ki_hieu?: string | null;
  ngay_ban_hanh?: string | null;
  co_quan_ban_hanh?: string | null;
  nguoi_ky?: string | null;
  trich_yeu?: string | null;
  hieu_luc?: string | null;
  tom_tat?: string | null;
  can_cu?: string[];
}

export const refDocApi = {
  list: async (params?: { skip?: number; limit?: number; loai?: string; hieu_luc?: string; q?: string; visibility?: "private" | "org" | "system"; sort?: string; order?: "asc" | "desc" }) => {
    const { data } = await api.get("/reference-docs/", { params });
    return data as RefDocListResponse;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/reference-docs/${id}`);
    return data as RefDoc;
  },

  create: async (payload: Omit<RefDoc, "id" | "file_path" | "file_size" | "file_type" | "created_at" | "updated_at" | "created_by" | "download_url">) => {
    const { data } = await api.post("/reference-docs/", payload);
    return data as RefDoc;
  },

  upload: async (id: string, file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/reference-docs/${id}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return data as RefDoc;
  },

  update: async (id: string, payload: Partial<Omit<RefDoc, "id" | "created_at" | "updated_at" | "created_by" | "download_url">>) => {
    const { data } = await api.put(`/reference-docs/${id}`, payload);
    return data as RefDoc;
  },

  remove: async (id: string) => {
    await api.delete(`/reference-docs/${id}`);
  },

  getMetadataPreview: async (id: string) => {
    const { data } = await api.get(`/reference-docs/${id}/metadata-preview`);
    return data as MetadataPreviewResponse;
  },

  confirmMetadata: async (id: string, payload: MetadataConfirmRequest) => {
    const { data } = await api.post(`/reference-docs/${id}/metadata-confirm`, payload);
    return data as RefDoc;
  },

  uploadBatch: async (files: File[], visibility: "private" | "org" | "system" = "private") => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("visibility", visibility);
    const { data } = await api.post("/reference-docs/upload-batch", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { jobs: Array<{ job_id: string; filename: string }> };
  },

  getJobStatus: async (jobId: string) => {
    const { data } = await api.get(`/reference-docs/status/${jobId}`);
    return data as {
      job_id: string;
      status: "pending" | "processing" | "done" | "failed";
      filename: string;
      doc_id: string | null;
      error: string | null;
    };
  },

  getContent: async (id: string) => {
    const { data } = await api.get(`/reference-docs/${id}/content`);
    return data as {
      id: string;
      title: string;
      so_ki_hieu: string | null;
      loai_van_ban: string | null;
      created_at: string | null;
      chunks: Array<{ chunk_index: number; content: string; dieu_khoan: string | null }>;
    };
  },

  exportFile: (id: string, format: "docx" | "pdf") =>
    api.get(`/reference-docs/${id}/export`, {
      params: { format },
      responseType: "blob",
    }),
};

export const ocrApi = {
  extract: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/ocr/extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // response.data: { filename, text, char_count, page_count }
  },

  export: (text: string, filename: string, format: "docx" | "pdf") =>
    api.post(
      "/ocr/export",
      { text, filename, format },
      { responseType: "blob" },
    ),

  getJobs: (params?: {
    skip?: number
    limit?: number
    status?: string
    file_type?: string
    sort_by?: string
    sort_order?: string
  }) =>
    api.get("/ocr/jobs", { params }),

  getJob: (jobId: string) =>
    api.get(`/ocr/${jobId}`),

  getProgress: (jobId: string) =>
    api.get(`/ocr/progress/${jobId}`),

  download: (jobId: string) =>
    api.get(`/ocr/${jobId}/download`, { responseType: "blob" }),

  exportDocx: (jobId: string) =>
    api.get(`/ocr/${jobId}/export/docx`, { responseType: "blob" }),

  review: async (jobId: string) => {
    const { data } = await api.post(`/ocr/${jobId}/review`);
    return data as ReviewResult & { job_id: string };
  },

  remove: (jobId: string) => api.delete(`/ocr/${jobId}`),
};

export interface ChunkUsed {
  document_title: string | null;
  so_ki_hieu: string | null;
  dieu_khoan: string | null;
  score: number;
  rerank_score: number | null;
  content_preview: string;
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  citations: string[];
  chunks_used: ChunkUsed[];
  confidence: number;
  citation_score: number;
  semantic_score: number;
  has_disclaimer: boolean;
  llm_available: boolean;
  fallback_mode: boolean;
  latency_ms: number;
}

export interface RAGHealthResponse {
  retrieval: string;
  llm: string;
  total_chunks: number;
  total_documents: number;
}

export const ragApi = {
  query: async (payload: { query: string; top_k?: number; min_score?: number }) => {
    const { data } = await api.post("/rag/query", payload);
    return data as RAGQueryResponse;
  },

  health: async () => {
    const { data } = await api.get("/rag/health");
    return data as RAGHealthResponse;
  },
};

export interface ChatCitation {
  document_title: string | null;
  so_ki_hieu: string | null;
  dieu_khoan: string | null;
  score: number;
  content_preview: string;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatHistoryResponse {
  doc_id: string;
  history: ChatHistoryItem[];
  total_turns: number;
}

export const documentSourcesApi = {
  list: async (documentId: string) => {
    const { data } = await api.get(`/documents/${documentId}/sources`);
    return data as RefDoc[];
  },
  add: async (documentId: string, referenceDocId: string) => {
    await api.post(`/documents/${documentId}/sources`, { reference_doc_id: referenceDocId });
  },
  remove: async (documentId: string, referenceDocId: string) => {
    await api.delete(`/documents/${documentId}/sources/${referenceDocId}`);
  },
};

export const chatApi = {
  streamChat: async (
    query: string,
    docId: string,
    docContext: string | undefined,
    onToken?: (token: string) => void,
    onCitations?: (citations: ChatCitation[]) => void,
    onDone?: () => void,
    onError?: (error: string) => void,
    sourceIds?: string[],
  ): Promise<void> => {
    try {
      const token = Cookies.get("access_token");
      const response = await fetch(`${BASE_URL}/api/v1/rag/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          query,
          doc_id: docId,
          doc_context: docContext,
          source_ids: sourceIds ?? [],
        }),
      });

      if (!response.ok) {
        onError?.(`HTTP ${response.status}`);
        return;
      }
      if (!response.body) {
        onError?.("Stream body không khả dụng");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone?.();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token") onToken?.(parsed.content);
            else if (parsed.type === "citations") onCitations?.(parsed.data);
            else if (parsed.type === "error") onError?.(parsed.content);
          } catch {}
        }
      }
    } catch (err) {
      onError?.(String(err));
    }
  },

  getHistory: async (docId: string): Promise<ChatHistoryResponse> => {
    const { data } = await api.get("/rag/chat/history", { params: { doc_id: docId } });
    return data as ChatHistoryResponse;
  },

  clearHistory: async (docId: string): Promise<void> => {
    await api.delete("/rag/chat/history", { params: { doc_id: docId } });
  },
};

export const formApi = {
  detect: async (
    query: string,
  ): Promise<{ form_name: string | null; form_file: string | null }> => {
    const { data } = await api.post("/forms/detect-form", { query });
    return data as { form_name: string | null; form_file: string | null };
  },

  downloadUrl: (formFile: string): string =>
    `${BASE_URL}/api/v1/forms/download?file=${encodeURIComponent(formFile)}`,
};

export const suggestApi = {
  getCanCu: async (loai_vb: string, trich_yeu: string, top_k: number = 5) => {
    const res = await api.post("/suggest/can-cu", { loai_vb, trich_yeu, top_k });
    return res.data as {
      items: Array<{
        text: string;
        source_doc: string;
        so_ki_hieu: string | null;
        score: number;
        rerank_score: number;
      }>;
      total: number;
      query_used: string;
    };
  },

  getTrichYeu: async (loai_vb: string, mo_ta: string = "") => {
    const res = await api.post("/suggest/trich-yeu", { loai_vb, mo_ta });
    return res.data as { suggestions: string[]; fallback: boolean };
  },

  getSoKiHieu: async (loai_vb: string, co_quan: string = "") => {
    const res = await api.get("/suggest/so-ki-hieu", { params: { loai_vb, co_quan } });
    return res.data as {
      so_ki_hieu: string;
      format_giai_thich: string;
      vi_du: string;
    };
  },

  getTrichYeuHistory: async (loai_vb: string, q: string = "", limit: number = 10) => {
    const res = await api.get("/suggest/trich-yeu-history", { params: { loai_vb, q, limit } });
    return res.data as {
      items: Array<{ trich_yeu: string; loai_van_ban: string; used_count: number; last_used_at: string | null }>;
      total: number;
    };
  },
};

export interface DocumentDto {
  id: string;
  title: string;
  content?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  loai_vb?: string | null;
  so_van_ban?: number | null;
  nam?: number | null;
  source: "editor" | "upload";
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentStats {
  total: number;
  editor_count: number;
  upload_count: number;
  by_type: Record<string, number>;
  recent_7_days: number;
}

export interface ReviewChange {
  section?: "trichYeu" | "canCu" | "noiDung" | "noiNhan" | "general";
  type: "chinh_ta" | "the_thuc" | "van_phong" | "dau_cau" | "thuat_ngu";
  original: string;
  revised: string;
  reason: string;
}

export interface ReviewResult {
  reviewed_text: string;
  changes: ReviewChange[];
  summary: string;
}

export const documentApi = {
  list: async (params?: {
    skip?: number
    limit?: number
    source?: "editor" | "upload"
    q?: string
    loai_vb?: string
    sort_by?: string
    sort_order?: string
  }) => {
    const { data } = await api.get("/documents/", { params });
    return data as { items: DocumentDto[]; total: number };
  },

  getStats: async () => {
    const { data } = await api.get("/documents/stats");
    return data as DocumentStats;
  },

  create: async (payload: { title: string; content?: string }) => {
    const { data } = await api.post("/documents/", payload);
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },

  nextNumber: async (loai: string) => {
    const { data } = await api.get("/documents/next-number", { params: { loai } });
    return data as { so: number; nam: number; loai: string };
  },

  update: async (id: string, payload: { title?: string; content?: string; loai_vb?: string; so_van_ban?: number | null; nam?: number | null }) => {
    const { data } = await api.patch(`/documents/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/documents/${id}`);
  },

  upload: async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/documents/${id}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  uploadFile: async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/documents/${id}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as DocumentDto & { extracted_text: string };
  },

  generate: async (payload: {
    document_id: string;
    loai_van_ban: string;
    yeu_cau: string;
    source_ids?: string[];
  }) => {
    const { data } = await api.post("/documents/generate", payload);
    return data as { status: "done" | "skipped"; document_id: string; content?: Record<string, unknown> };
  },

  exportPdf: async (id: string): Promise<Blob> => {
    const { data } = await api.post(`/documents/${id}/export/pdf`, null, {
      responseType: "blob",
    });
    return data as Blob;
  },

  exportDocx: async (id: string): Promise<Blob> => {
    const { data } = await api.post(`/documents/${id}/export/docx`, null, {
      responseType: "blob",
    });
    return data as Blob;
  },

  uploadBatch: async (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const { data } = await api.post("/documents/upload-batch", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { jobs: Array<{ job_id: string; filename: string }> };
  },

  getJobStatus: async (jobId: string) => {
    const { data } = await api.get(`/documents/status/${jobId}`);
    return data as {
      job_id: string;
      status: "pending" | "processing" | "done" | "failed";
      filename: string;
      error: string | null;
    };
  },

  review: async (docId: string, content?: string) => {
    const { data } = await api.post(
      `/documents/${docId}/review?t=${Date.now()}`,
      content ? { content } : {}
    );
    return data as ReviewResult & { doc_id: string };
  },
};
