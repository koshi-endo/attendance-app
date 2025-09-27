import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  attendanceApi: {
    getRecords: vi.fn(),
    upsertRecord: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('AttendanceCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.attendanceApi.getRecords.mockResolvedValue([]);
  });

  it('renders attendance calendar with month picker', async () => {
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    expect(screen.getByText('Attendance Calendar')).toBeInTheDocument();
    expect(screen.getByText('September 2025')).toBeInTheDocument();
    expect(screen.getByText("Today's Attendance")).toBeInTheDocument();
  });

  it('displays attendance table with proper headers', async () => {
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Clock In')).toBeInTheDocument();
    expect(screen.getByText('Clock Out')).toBeInTheDocument();
    expect(screen.getByText('Break (min)')).toBeInTheDocument();
    expect(screen.getByText('Work Hours')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('shows today row with badge', async () => {
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders today attendance form with all fields', async () => {
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/Clock In Time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clock Out Time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Break Minutes/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Note/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Attendance/ })).toBeInTheDocument();
  });

  it('validates clock in time is required', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Clock in time is required/)).toBeInTheDocument();
    });
  });

  it('validates clock out time must be after clock in', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const clockInInput = screen.getByLabelText(/Clock In Time/);
    const clockOutInput = screen.getByLabelText(/Clock Out Time/);
    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });

    await user.type(clockInInput, '17:00');
    await user.type(clockOutInput, '09:00');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Clock out time must be after clock in time/)).toBeInTheDocument();
    });
  });

  it('validates break minutes must be non-negative', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const clockInInput = screen.getByLabelText(/Clock In Time/);
    const breakInput = screen.getByLabelText(/Break Minutes/);
    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });

    await user.type(clockInInput, '09:00');
    await user.clear(breakInput);
    await user.type(breakInput, '-30');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Break minutes must be 0 or greater/)).toBeInTheDocument();
    });
  });

  it('submits valid attendance data successfully', async () => {
    const user = userEvent.setup();
    
    mockApi.attendanceApi.upsertRecord.mockResolvedValue({
      id: 1,
      date: '2025-09-27',
      check_in_time: '2025-09-27T09:00:00Z',
      check_out_time: '2025-09-27T17:30:00Z',
      status: 'completed',
      work_hours: 8.0,
      break_minutes: 60,
      note: 'Test note'
    });

    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const clockInInput = screen.getByLabelText(/Clock In Time/);
    const clockOutInput = screen.getByLabelText(/Clock Out Time/);
    const breakInput = screen.getByLabelText(/Break Minutes/);
    const noteInput = screen.getByLabelText(/Note/);
    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });

    await user.type(clockInInput, '09:00');
    await user.type(clockOutInput, '17:30');
    await user.clear(breakInput);
    await user.type(breakInput, '60');
    await user.type(noteInput, 'Test note');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApi.attendanceApi.upsertRecord).toHaveBeenCalledWith('2025-09-27', {
        clock_in: '09:00',
        clock_out: '17:30',
        break_minutes: 60,
        note: 'Test note'
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    mockApi.attendanceApi.upsertRecord.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const clockInInput = screen.getByLabelText(/Clock In Time/);
    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });

    await user.type(clockInInput, '09:00');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApi.attendanceApi.upsertRecord).toHaveBeenCalled();
    });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApi.attendanceApi.upsertRecord.mockReturnValue(promise);

    render(
      <TestWrapper>
        <AttendanceCalendar />
      </TestWrapper>
    );

    const clockInInput = screen.getByLabelText(/Clock In Time/);
    const saveButton = screen.getByRole('button', { name: /Save Attendance/ });

    await user.type(clockInInput, '09:00');
    await user.click(saveButton);

    expect(screen.getByText(/Saving.../)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    resolvePromise({
      id: 1,
      date: '2025-09-27',
      check_in_time: '2025-09-27T09:00:00Z',
      check_out_time: null,
      status: 'checked_in',
      work_hours: null,
      break_minutes: 0,
      note: null
    });

    await waitFor(() => {
      expect(screen.queryByText(/Saving.../)).not.toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });
  });
});
