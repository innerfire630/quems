// =============================================================================
// src/app/(auth)/login/page.tsx — Login page
// =============================================================================
// Server component. Parses the callbackUrl query parameter (with open-redirect
// protection) and renders the LoginForm client component.
// =============================================================================

import { LoginForm } from './_components/login-form';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawCallbackUrl = params.callbackUrl;

  // Open-redirect protection: only accept relative paths
  let callbackUrl = '/';
  if (rawCallbackUrl?.startsWith('/') && !rawCallbackUrl.startsWith('//')) {
    callbackUrl = rawCallbackUrl;
  }

  return <LoginForm callbackUrl={callbackUrl} />;
}
