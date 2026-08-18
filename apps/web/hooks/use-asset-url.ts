import { useEffect, useState } from "react";
import { storageService } from "@nexus/storage";

/**
 * Loads the Blob for `assetId` from IndexedDB and exposes it as an object
 * URL for <img>/<video>/<audio>/<a> to consume. Revokes the URL on unmount
 * or when `assetId` changes, so we don't leak memory as the user pans past
 * dozens of media nodes. No cross-node caching yet — see docs/roadmap.md
 * (Fase 5) for the plan to add one once it's needed at scale.
 */
export function useAssetUrl(assetId: string | undefined) {
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
        if (!blob) {
          setError(true);
          setLoading(false);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return { url, loading, error };
}
