import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The link-share card (og:image). A branded 1200x630: warm-dark Aura ground with
// an aurora glow, the serif "aura" wordmark, and the tagline. No dominating
// circle, the aurora reads as light, not a big orb. Rendered server-side via
// satori (nodejs runtime, so we can read the bundled fonts).

export const alt = "aura · meet people you click with, then keep seeing them";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const bold = readFileSync(join(process.cwd(), "public/fonts/serif-700.woff"));
  const reg = readFileSync(join(process.cwd(), "public/fonts/serif-400.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "78px 88px",
          backgroundColor: "#17130d",
          backgroundImage:
            "radial-gradient(65% 90% at 82% 16%, rgba(162,78,134,0.5), rgba(119,82,230,0.22) 42%, rgba(23,19,13,0) 68%)",
          color: "#f2ead8",
          fontFamily: "serif-reg",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 46,
              backgroundImage: "radial-gradient(circle at 34% 30%, #e97f57, #c65e9a 46%, #8f6bff 90%)",
            }}
          />
          <div style={{ display: "flex", fontSize: 24, color: "#a89b83", letterSpacing: 1 }}>Now in Toronto</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "serif-bold", fontSize: 150, lineHeight: 1 }}>
            <span style={{ color: "#e97f57" }}>a</span>
            <span>ura</span>
          </div>
          <div style={{ fontFamily: "serif-bold", fontSize: 50, marginTop: 24, maxWidth: 960, lineHeight: 1.16 }}>
            Meet people you click with. Then keep seeing them.
          </div>
        </div>

        <div style={{ fontSize: 26, color: "#a89b83" }}>meetonaura.com</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "serif-bold", data: bold, weight: 700, style: "normal" },
        { name: "serif-reg", data: reg, weight: 400, style: "normal" },
      ],
    },
  );
}
