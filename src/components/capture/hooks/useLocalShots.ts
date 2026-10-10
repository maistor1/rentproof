"use client";

import { useEffect, useMemo, useRef } from "react";

export interface LocalShots {
  add(blob: Blob): string; // returns an object URL for an instant preview
  get(url: string): Blob | undefined;
  retain(urls: ReadonlySet<string>): void; // revoke everything not in the set
}

// Registry of captured blobs and their object URLs. Blobs stay out of reducer
// state so the state is plain data; URLs are revoked once nothing shows them.
export function useLocalShots(): LocalShots {
  const registry = useRef<Map<string, Blob>>(new Map());

  useEffect(() => {
    const shots = registry.current;
    return () => {
      for (const url of shots.keys()) URL.revokeObjectURL(url);
      shots.clear();
    };
  }, []);

  return useMemo(
    () => ({
      add(blob) {
        const url = URL.createObjectURL(blob);
        registry.current.set(url, blob);
        return url;
      },
      get(url) {
        return registry.current.get(url);
      },
      retain(urls) {
        for (const url of [...registry.current.keys()]) {
          if (urls.has(url)) continue;
          URL.revokeObjectURL(url);
          registry.current.delete(url);
        }
      },
    }),
    [],
  );
}
