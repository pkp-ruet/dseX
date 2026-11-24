"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { apiGetSurvey } from "@/lib/api";
import { authHref } from "@/lib/next-path";
import { trackEvent } from "@/lib/track";
import type { SurveyState } from "@/lib/survey";
import SurveyFlow from "@/components/survey/SurveyFlow";
import Skeleton from "@/components/ui/Skeleton";

/**
 * `/feedback`: the reader survey on its own page, for any signed-in reader,
 * whether or not the pop-up asked them (the menu, the profile and the survey
 * email link here). A finished survey opens on its thank-you, with
 * "Change my answers".
 */
export default function FeedbackClient() {
  const { isLoading, isLoggedIn } = useAuth();
  const [state, setState] = useState<SurveyState | null>(null);
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    let from = "";
    try {
      from = (new URLSearchParams(window.location.search).get("src") ?? "").slice(0, 40);
    } catch {}
    setSrc(from);
    let live = true;
    apiGetSurvey()
      .then((s) => {
        if (!live) return;
        setState(s);
        trackEvent("survey_page_open", { segment: s.segment, src: from || "direct" });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [isLoading, isLoggedIn]);

  if (isLoading) return <Skeleton height={420} width="100%" rounded="16px" />;

  if (!isLoggedIn) {
    return (
      <div className="sv sv--page">
        <div className="sv-panel">
          <div className="sv-body">
            <div className="sv-hero">
              <h2 className="sv-title">
                <T en="Sign in to share your feedback" bn="মতামত দিতে সাইন ইন করুন" />
              </h2>
              <p className="sv-lead">
                <T
                  en="Your answers are tied to your account, so you can stop and continue later on any device."
                  bn="উত্তরগুলো আপনার অ্যাকাউন্টে থাকে, তাই মাঝপথে থেমে পরে যেকোনো ডিভাইস থেকে শেষ করতে পারবেন।"
                />
              </p>
              <div className="sv-actions">
                <Link href={authHref("/login", "/feedback")} className="btn-primary btn-lg btn-block">
                  <T en="Sign in" bn="সাইন ইন" />
                </Link>
                <Link href={authHref("/register", "/feedback")} className="btn-quiet btn-lg btn-block">
                  <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <p className="sv-err" role="alert">
        <T en="We couldn't load the questions. Please try again in a moment." bn="প্রশ্নগুলো আনা যায়নি। একটু পরে আবার চেষ্টা করুন।" />
      </p>
    );
  }

  if (!state) return <Skeleton height={420} width="100%" rounded="16px" />;

  return (
    <div className="sv sv--page">
      <div className="sv-panel">
        <SurveyFlow state={state} mode="page" fromPath={src ? `/feedback?src=${src}` : "/feedback"} />
      </div>
    </div>
  );
}
