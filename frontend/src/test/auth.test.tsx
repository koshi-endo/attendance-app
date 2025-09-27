import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authApi } from '@/lib/api';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByText('Sign in to Attendance App')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'test-token',
      token_type: 'bearer'
    });
    
    vi.mocked(authApi.me).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      is_active: true,
      is_superuser: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: null
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(vi.mocked(authApi.login)).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password'
      });
    });
  });

  it('protects routes requiring authentication', () => {
    render(
      <TestWrapper>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
