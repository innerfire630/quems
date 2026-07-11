// =============================================================================
// src/app/(auth)/login/_components/login-form.tsx — Login form client component
// =============================================================================
// Renders the email/password form inside the auth card. Handles client-side
// Zod validation, NextAuth signIn call, loading state, and error display.
// =============================================================================

'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginSchema } from '@/schemas/auth.schema';

interface LoginFormProps {
  callbackUrl: string;
  initialError?: string;
}

export function LoginForm({ callbackUrl, initialError }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setError(firstIssue?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);

    try {
      // Pre-check account status before NextAuth signIn (NextAuth swallows custom errors)
      const statusCheck = await fetch('/api/auth/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const statusJson = await statusCheck.json();
      if (!statusCheck.ok && statusJson.error?.code === 'ACCOUNT_DEACTIVATED') {
        setError(statusJson.error.message);
        setIsSubmitting(false);
        return;
      }

      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!res || res.error) {
        const errorCode = res?.error ?? '';
        const errorMessage =
          errorCode === 'AccountDeactivated'
            ? 'Your account has been deactivated. Contact an administrator for assistance.'
            : errorCode === 'AccountSuspended'
              ? 'Your account has been suspended. Contact an administrator for assistance.'
              : errorCode === 'CredentialsSignin'
                ? 'Invalid username or password'
                : (errorCode ?? 'Sign-in failed');
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setError('Sign-in failed');
        setIsSubmitting(false);
        return;
      }

      // Full page reload ensures the session cookie is read by server components
      window.location.href = callbackUrl;
    } catch (err) {
      // NextAuth v5 throws CredentialsSignin when authorize() returns null.
      // Check the error's type property (safer than instanceof for client bundles).
      const errObj = err as Record<string, unknown>;
      const isCredentialsError = errObj?.type === 'CredentialsSignin';
      const errMsg = String(errObj?.message ?? '');
      if (errMsg.includes('AccountDeactivated')) {
        setError('Your account has been deactivated. Contact an administrator for assistance.');
      } else if (errMsg.includes('AccountSuspended')) {
        setError('Your account has been suspended. Contact an administrator for assistance.');
      } else {
        setError(
          isCredentialsError
            ? 'Invalid username or password'
            : 'An unexpected error occurred. Please try again.',
        );
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" role="alert" className="border-red-300 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-username">Username</Label>
        <Input
          id="login-username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
