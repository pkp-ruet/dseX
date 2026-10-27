"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { apiGoogleSignIn, type AuthApiResponse } from "@/lib/api";
import { useLang } from "@/context/LangContext";

interface Props {
  onSuccess: (data: AuthApiResponse) => void | Promise<void>;
  onError?: (message: string) => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  const [pending, setPending] = useState(false);
  const { lang } = useLang();
  const failed =
    lang === "bn"
      ? "গুগল দিয়ে সাইন ইন করা যায়নি। আবার চেষ্টা করুন।"
      : "We couldn't sign you in with Google. Please try again.";

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null;
  }

  async function handleCredential(res: CredentialResponse) {
    if (!res.credential) {
      onError?.(failed);
      return;
    }
    setPending(true);
    try {
      const data = await apiGoogleSignIn(res.credential);
      await onSuccess(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : failed;
      onError?.(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full flex justify-center" aria-busy={pending}>
      <GoogleLogin
        onSuccess={handleCredential}
        onError={() => onError?.(failed)}
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
