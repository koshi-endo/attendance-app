import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  work_hours: number | null;
  break_minutes: number;
  note: string | null;
}

export interface AttendanceUpsertRequest {
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  note?: string;
}

export interface AttendanceSummary {
  total_days: number;
  total_hours: number;
  average_hours: number;
  records: AttendanceRecord[];
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },
  
  me: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: () => {
    Cookies.remove('access_token');
  }
};

export interface AttendanceWithUser extends AttendanceRecord {
  user: User;
}

export const attendanceApi = {
  getRecords: async (startDate?: string, endDate?: string, limit?: number): Promise<AttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/attendance/records?${params.toString()}`);
    return response.data;
  },
  
  getSummary: async (startDate?: string, endDate?: string): Promise<AttendanceSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/attendance/summary?${params.toString()}`);
    return response.data;
  },
  
  upsertRecord: async (workDate: string, data: AttendanceUpsertRequest): Promise<AttendanceRecord> => {
    const response = await api.put(`/attendance/me/${workDate}`, data);
    return response.data;
  },
  
  getStatus: async (): Promise<AttendanceRecord | null> => {
    const response = await api.get('/attendance/status');
    return response.data;
  }
};

export const adminApi = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/attendance/all-users');
    return response.data;
  },
  
  getDailyAttendance: async (date: string): Promise<AttendanceWithUser[]> => {
    const response = await api.get(`/attendance/users?date=${date}`);
    return response.data;
  },
  
  getUserMonthlyAttendance: async (userId: number, month: string): Promise<AttendanceRecord[]> => {
    const response = await api.get(`/attendance/user/${userId}?month=${month}`);
    return response.data;
  }
};
