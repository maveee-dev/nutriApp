import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyEmailPage } from './VerifyEmailPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { authApi } from '../api/authApi';

vi.mock('../api/authApi', () => ({
  authApi: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedAuthApi = vi.mocked(authApi);

describe('authentication pages', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthApi.verifyEmail.mockResolvedValue({ message: 'Email verified.' });
    mockedAuthApi.resendVerification.mockResolvedValue({ message: 'A new code was sent.' });
    mockedAuthApi.forgotPassword.mockResolvedValue({ message: 'If an account exists, an email has been sent.' });
    mockedAuthApi.resetPassword.mockResolvedValue({ message: 'Password reset.' });
  });

  it('submits email verification and sends a cooldown-protected resend request', async () => {
    render(<MemoryRouter initialEntries={['/verify-email?email=person%40example.com']}><VerifyEmailPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

    await waitFor(() => expect(mockedAuthApi.verifyEmail).toHaveBeenCalledWith({ email: 'person@example.com', code: '123456' }));
    expect(screen.getByRole('status')).toHaveTextContent('Email verified.');

    fireEvent.click(screen.getByRole('button', { name: 'Send another code' }));
    await waitFor(() => expect(mockedAuthApi.resendVerification).toHaveBeenCalledWith({ email: 'person@example.com' }));
    expect(screen.getByRole('button', { name: /Resend available in/ })).toBeDisabled();
  });

  it('keeps the password recovery response generic', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    await waitFor(() => expect(mockedAuthApi.forgotPassword).toHaveBeenCalledWith({ email: 'person@example.com' }));
    expect(screen.getByRole('status')).toHaveTextContent('If an account exists');
  });

  it('rejects mismatched reset passwords before calling the API', async () => {
    render(<MemoryRouter initialEntries={['/reset-password?email=person%40example.com']}><ResetPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Reset code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(mockedAuthApi.resetPassword).not.toHaveBeenCalled();
  });
});
