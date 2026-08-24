import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '../api/authApi';
import { AuthShell } from '../AuthShell';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter the email address used to create your account.'); return; }
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit verification code from your email.'); return; }
    setIsSubmitting(true);
    try {
      const response = await authApi.verifyEmail({ email: email.trim(), code });
      setMessage(response.message || 'Your email has been verified.');
      window.setTimeout(() => navigate('/login?verified=1'), 700);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'We could not verify that code.');
    } finally { setIsSubmitting(false); }
  };

  const handleResend = async () => {
    setError(''); setMessage('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter your email address before requesting another code.'); return; }
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      const response = await authApi.resendVerification({ email: email.trim() });
      setMessage(response.message || 'If the account can be verified, a new code has been sent.');
      setCooldown(60);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'We could not send another code.');
    } finally { setIsResending(false); }
  };

  return (
    <AuthShell title="Verify your email" description="Enter the one-time code we sent to confirm your email address." footer={<p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>Already verified? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Sign in</Link></p>}>
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && <div role="alert" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-danger-subtle)', border: '1.5px solid var(--color-danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: 600 }}><AlertCircle size={18} />{error}</div>}
          {message && <div role="status" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-success-subtle)', border: '1.5px solid var(--color-success-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 600 }}><CheckCircle2 size={18} />{message}</div>}
          <Input label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} leftIcon={<Mail size={18} />} autoComplete="email" />
          <Input label="Verification code" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} leftIcon={<ShieldCheck size={18} />} autoComplete="one-time-code" />
          <Button type="submit" size="lg" isLoading={isSubmitting} style={{ width: '100%' }}>Verify email</Button>
          <Button type="button" variant="secondary" isLoading={isResending} disabled={cooldown > 0} leftIcon={<RefreshCw size={17} />} onClick={handleResend} style={{ width: '100%' }}>{cooldown > 0 ? `Resend available in ${cooldown}s` : 'Send another code'}</Button>
        </form>
      </Card>
    </AuthShell>
  );
};
