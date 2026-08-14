import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Inlines lucide's "images" glyph as raw SVG rather than importing the
 * lucide-react component: that component is a client-only export and
 * can't be invoked from this server-only route.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4A5D3A",
        borderRadius: 7,
      }}
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FBF7F0"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
        <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
        <circle cx="13" cy="7" r="1" fill="#FBF7F0" />
        <rect x="8" y="2" width="14" height="14" rx="2" />
      </svg>
    </div>,
    { ...size },
  );
}
