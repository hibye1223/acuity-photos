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
        gap: 24,
        backgroundColor: "#FBF7F0",
        color: "#3A2E22",
        fontFamily: "sans-serif",
      }}
    >
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
