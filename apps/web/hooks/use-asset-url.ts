import { useEffect, useState } from "react";
import { storageService } from "@nexus/storage";

/**
 * Loads the Blob for `assetId` from IndexedDB and exposes it as an object
 * URL for <img>/<video>/<audio>/<a> to consume. Revokes the URL on unmount
 * or when `assetId` changes, so we don't leak memory as the user pans past
 * dozens of media nodes.
 *
 * If the local blob is not found (e.g. viewer on a different device),
 * falls back to `publicUrl` from Supabase Storage.
 */
export function useAssetUrl(assetId: string | undefined, publicUrl?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(assetId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);

    storageService
      .getAssetBlob(assetId)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setLoading(false);
          return;
        }
        // Local blob not found — fall back to Supabase Storage public URL
        if (publicUrl) {
          setUrl(publicUrl);
          setLoading(false);
          return;
        }
        setError(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          // Try publicUrl as fallback on error too
          if (publicUrl) {
            setUrl(publicUrl);
            setLoading(false);
          } else {
            setError(true);
            setLoading(false);
          }
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, publicUrl]);

  return { url, loading, error };
}
