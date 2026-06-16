"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { apiGoogleSignIn, type AuthApiResponse } from "@/lib/api";

interface Props {
  onSuccess: (data: AuthApiResponse) => void | Promise<void>;
  onError?: (message: string) => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  const [pending, setPending] = useState(false);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null;
  }

  async function handleCredential(res: CredentialResponse) {
    if (!res.credential) {
      onError?.("Google sign-in failed, please try again.");
      return;
    }
    setPending(true);
    try {
      const data = await apiGoogleSignIn(res.credential);
      await onSuccess(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      onError?.(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full flex justify-center" aria-busy={pending}>
      <GoogleLogin
        onSuccess={handleCredential}
        onError={() => onError?.("Google sign-in failed, please try again.")}
        text="continue_with"
        theme="outline"
        shape="pill"
        size="large"
        logo_alignment="left"
        width="320"
      />
    </div>
  );
}
