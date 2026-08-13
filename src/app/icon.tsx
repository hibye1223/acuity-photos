import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
        color: "#FBF7F0",
        fontFamily: "sans-serif",
        fontSize: 20,
        fontWeight: 700,
        borderRadius: 6,
      }}
    >
      A
    </div>,
    { ...size },
  );
}
