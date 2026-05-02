"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiAuthPing } from "@/lib/api";

export default function PingTracker() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) apiAuthPing();
  }, [isLoggedIn]);

  return null;
}
