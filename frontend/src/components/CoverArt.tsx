import { useEffect, useState } from "react";
import { api } from "../api";

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="#3a2a17"/><stop offset="100%" stop-color="#1a1208"/>
       </linearGradient></defs>
       <rect width="120" height="120" fill="url(#g)"/>
       <circle cx="60" cy="60" r="30" fill="none" stroke="#f2a641" stroke-opacity="0.5" stroke-width="2"/>
       <circle cx="60" cy="60" r="6" fill="#f2a641"/>
     </svg>`,
  );

export function CoverArt({
  trackId,
  hasCover,
  alt,
  className = "cover",
}: {
  trackId: string;
  hasCover: boolean;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    if (!hasCover) {
      setSrc(FALLBACK);
      return;
    }
    api
      .trackUrls(trackId)
      .then(({ cover_url }) => !cancelled && setSrc(cover_url || FALLBACK))
      .catch(() => !cancelled && setSrc(FALLBACK));
    return () => {
      cancelled = true;
    };
  }, [trackId, hasCover]);

  return <img src={src} alt={alt} loading="lazy" className={className} />;
}
