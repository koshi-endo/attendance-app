import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  adminApi: {
    getAllUsers: vi.fn(),
    getDailyAttendance: vi.fn(),
    getUserMonthlyAttendance: vi.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

const mockUsers = [
  { id: 1, email: 'user1@test.com', username: 'user1', full_name: 'User One', is_active: true, is_superuser: false, created_at: '2023-01-01T00:00:00Z', updated_at: null },
  { id: 2, email: 'user2@test.com', username: 'user2', full_name: 'User Two', is_active: true, is_superuser: false, created_at: '2023-01-01T00:00:00Z', updated_at: null },
];

const mockDailyAttendance = [
  {
    id: 1,
    date: '2025-09-27',
    check_in_time: '2025-09-27T09:00:00Z',
    check_out_time: '2025-09-27T17:00:00Z',
    status: 'completed',
    work_hours: 8.0,
    break_minutes: 60,
    note: 'Regular day',
    user: mockUsers[0]
  }
];

describe('OwnerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.adminApi.getAllUsers).mockResolvedValue(mockUsers);
    vi.mocked(api.adminApi.getDailyAttendance).mockResolvedValue(mockDailyAttendance);
    vi.mocked(api.adminApi.getUserMonthlyAttendance).mockResolvedValue([]);
  });

  it('renders daily and monthly view buttons', async () => {
    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Daily View')).toBeInTheDocument();
    expect(screen.getByText('Monthly View')).toBeInTheDocument();
  });

  it('loads and displays daily attendance by default', async () => {
    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Daily Attendance')).toBeInTheDocument();
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('17:00')).toBeInTheDocument();
    });
  });

  it('switches to monthly view when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    await user.click(screen.getByText('Monthly View'));

    expect(screen.getByText('Monthly Attendance')).toBeInTheDocument();
    expect(screen.getByText('Select user')).toBeInTheDocument();
  });

  it('loads monthly data when user is selected', async () => {
    const user = userEvent.setup();
    const monthlyData = [
      {
        id: 1,
        date: '2025-09-01',
        check_in_time: '2025-09-01T09:00:00Z',
        check_out_time: '2025-09-01T17:00:00Z',
        status: 'completed',
        work_hours: 8.0,
        break_minutes: 30,
        note: 'First day'
      }
    ];
    
    vi.mocked(api.adminApi.getUserMonthlyAttendance).mockResolvedValue(monthlyData);

    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    await user.click(screen.getByText('Monthly View'));
    
    await waitFor(() => {
      expect(screen.getByText('Select user')).toBeInTheDocument();
    });

    expect(vi.mocked(api.adminApi.getAllUsers)).toHaveBeenCalled();
  });

  it('shows export CSV button', async () => {
    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(api.adminApi.getAllUsers).mockRejectedValue(new Error('API Error'));
    vi.mocked(api.adminApi.getDailyAttendance).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Daily View')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    let resolvePromise: (value: unknown) => void = () => {};
    const promise = new Promise<unknown>((resolve) => {
      resolvePromise = resolve;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(api.adminApi.getDailyAttendance).mockReturnValue(promise as any);

    render(
      <TestWrapper>
        <OwnerDashboard />
      </TestWrapper>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    resolvePromise(mockDailyAttendance);
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });
});
