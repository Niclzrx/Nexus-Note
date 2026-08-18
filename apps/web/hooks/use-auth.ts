import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export interface AuthProfile {
  id: string;
  username: string;
  createdAt: string;
}

interface UseAuthResult {
  profile: AuthProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, created_at")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      setProfile(data ? { id: data.id, username: data.username, createdAt: data.created_at } : null);
      setLoading(false);
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await fetch("/api/auth/logout", { method: "POST" });
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return { profile, loading, signOut };
}
