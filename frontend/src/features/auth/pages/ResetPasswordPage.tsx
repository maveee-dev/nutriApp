import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Lock, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '../api/authApi';
import { AuthShell } from '../AuthShell';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit reset code from your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword({ email: email.trim(), code, password });
      setMessage(response.message || 'Your password has been reset.');
      window.setTimeout(() => navigate('/login?reset=1'), 700);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'We could not reset your password.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <AuthShell title="Choose a new password" description="Use the one-time code from your email, then choose a new password." footer={<p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>Need a new code? <Link to="/forgot-password" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Request one</Link></p>}>
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && <div role="alert" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-danger-subtle)', border: '1.5px solid var(--color-danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: 600 }}><AlertCircle size={18} />{error}</div>}
          {message && <div role="status" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-success-subtle)', border: '1.5px solid var(--color-success-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 600 }}><CheckCircle2 size={18} />{message}</div>}
          <Input label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} leftIcon={<Mail size={18} />} autoComplete="email" />
          <Input label="Reset code" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} leftIcon={<KeyRound size={18} />} autoComplete="one-time-code" />
          <Input label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} leftIcon={<Lock size={18} />} autoComplete="new-password" helperText="Use at least 8 characters." />
          <Input label="Confirm new password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} leftIcon={<Lock size={18} />} autoComplete="new-password" />
          <Button type="submit" size="lg" isLoading={isSubmitting} style={{ width: '100%' }}>Reset password</Button>
        </form>
      </Card>
    </AuthShell>
  );
};
