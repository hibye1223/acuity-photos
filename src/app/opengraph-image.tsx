import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        backgroundColor: "#FBF7F0",
        color: "#3A2E22",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 9,
            backgroundColor: "#4A5D3A",
          }}
        >
          <svg
            aria-hidden="true"
            width="24"
            height="24"
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
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#4A5D3A",
            letterSpacing: -0.5,
          }}
        >
          Acuity Photos
        </div>
      </div>
      <div
        style={{
          fontSize: 60,
          fontWeight: 600,
          textAlign: "center",
          maxWidth: 900,
          letterSpacing: -1.5,
        }}
      >
        Finally, an album you'd actually share.
      </div>
    </div>,
    { ...size },
  );
}
