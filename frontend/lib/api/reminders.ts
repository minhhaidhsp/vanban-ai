import { api } from "../api";

export interface ReminderCreate {
  title: string;
  description?: string;
  remind_at: string;
  document_id?: string;
  recipients: string[];
}

export interface ReminderUpdate {
  title?: string;
  description?: string;
  remind_at?: string;
  status?: string;
  recipients?: string[];
}

export interface ReminderOut {
  id: string;
  title: string;
  description?: string;
  remind_at: string;
  channel: string;
  status: string;
  document_id?: string;
  document_title?: string;
  recipients: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
}

export const remindersApi = {
  getReminders: async (params?: {
    status?: string;
    upcoming?: boolean;
  }): Promise<ReminderOut[]> => {
    const { data } = await api.get("/reminders/", { params });
    return data as ReminderOut[];
  },

  createReminder: async (payload: ReminderCreate): Promise<ReminderOut> => {
    const { data } = await api.post("/reminders/", payload);
    return data as ReminderOut;
  },

  updateReminder: async (
    id: string,
    payload: ReminderUpdate
  ): Promise<ReminderOut> => {
    const { data } = await api.patch(`/reminders/${id}`, payload);
    return data as ReminderOut;
  },

  deleteReminder: async (id: string): Promise<void> => {
    await api.delete(`/reminders/${id}`);
  },

  resendReminder: async (id: string): Promise<void> => {
    await api.post(`/reminders/${id}/resend`);
  },

  searchUsers: async (q: string): Promise<UserSearchResult[]> => {
    const { data } = await api.get("/reminders/users/search", { params: { q } });
    return data as UserSearchResult[];
  },
};
