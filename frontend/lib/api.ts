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
};
