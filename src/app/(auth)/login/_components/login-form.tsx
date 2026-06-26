// =============================================================================
// src/app/(auth)/login/_components/login-form.tsx — Login form client component
// =============================================================================
// Renders the email/password form inside the auth card. Handles client-side
// Zod validation, NextAuth signIn call, loading state, and error display.
// =============================================================================

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginSchema } from '@/schemas/auth.schema';

interface LoginFormProps {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setError(firstIssue?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!res?.ok) {
        setError(
          res?.error === 'CredentialsSignin'
            ? 'Invalid email or password'
            : (res?.error ?? 'Sign-in failed'),
        );
        setIsSubmitting(false);
        return;
      }

      router.push(res?.url ?? callbackUrl);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
