import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '../api/authApi';
import { AuthShell } from '../AuthShell';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setIsSubmitting(true);
    try {
      const response = await authApi.forgotPassword({ email: email.trim() });
      setMessage(response.message || 'If an account exists, password reset instructions will be sent.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not process that request.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <AuthShell title="Reset your password" description="We will email a one-time code if an account matches this address." footer={<p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>Remembered it? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Sign in</Link></p>}>
      <Card style={{ border: '1.5px solid var(--border-light)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && <div role="alert" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-danger-subtle)', border: '1.5px solid var(--color-danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem', fontWeight: 600 }}><AlertCircle size={18} />{error}</div>}
          {message && <div role="status" style={{ display: 'flex', gap: '10px', padding: '12px 14px', backgroundColor: 'var(--color-success-subtle)', border: '1.5px solid var(--color-success-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 600 }}><CheckCircle2 size={18} />{message}</div>}
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} leftIcon={<Mail size={18} />} autoComplete="email" autoFocus />
          <Button type="submit" size="lg" isLoading={isSubmitting} rightIcon={<ArrowRight size={18} />} style={{ width: '100%' }}>Send reset code</Button>
          {message && <Link to={`/reset-password?email=${encodeURIComponent(email.trim())}`} style={{ color: 'var(--color-primary)', fontWeight: 700, textAlign: 'center' }}>I have a reset code</Link>}
        </form>
      </Card>
    </AuthShell>
  );
};
