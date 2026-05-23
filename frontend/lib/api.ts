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
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  tom_tat: string | null;
  tu_khoa: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  download_url: string | null;
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
  list: async (params?: { skip?: number; limit?: number; loai?: string; hieu_luc?: string; q?: string }) => {
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

export const documentApi = {
  list: async (skip = 0, limit = 20) => {
    const { data } = await api.get("/documents/", { params: { skip, limit } });
    return data as Document[];
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

  exportPdf: async (id: string): Promise<Blob> => {
    const { data } = await api.post(`/documents/${id}/export/pdf`, null, {
      responseType: "blob",
    });
    return data as Blob;
  },
};
