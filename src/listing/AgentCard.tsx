// The call to action: the agent's photo, name, mobile and email, the Global RE
// logo, the licence number, and a pulsing "Call now".
import { Mail, Phone } from "lucide-react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CardStage } from "./CardStage";
import { BUSINESS, COPY, licenceLine, type Agent } from "./copy";
import { C, clamp, SANS, SERIF, usePair } from "./theme";

export const AgentCard: React.FC<{ slug: string; agent: Agent }> = ({
  slug,
  agent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [call, callSub] = usePair()(COPY.callNow.vi, COPY.callNow.en);
  const face = spring({
    frame: frame - 6,
    fps,
    config: { damping: 13, stiffness: 150 },
  });
  const pulse = 1 + 0.05 * Math.sin((frame / fps) * Math.PI * 2.2);
  const row = (at: number) => ({
    opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
    transform: `translateY(${interpolate(frame, [at, at + 10], [16, 0], clamp)}px)`,
  });
  return (
    <CardStage
      slug={slug}
      photo={null}
      top={440}
      panel={{ padding: "36px 44px", gap: 20 }}
    >
      <Img
        src={staticFile(BUSINESS.logo)}
        style={{ width: 200, height: "auto" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          width: "100%",
          marginTop: 6,
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            overflow: "hidden",
            border: `5px solid ${C.gold}`,
            flexShrink: 0,
            transform: `scale(${face})`,
            boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
          }}
        >
          <Img
            src={staticFile(agent.photo)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 30%",
            }}
          />
        </div>
        <div style={{ fontFamily: SANS, ...row(10) }}>
          <div
            style={{
              color: C.cream,
              fontFamily: SERIF,
              fontSize: 48,
              lineHeight: 1.2,
            }}
          >
            {agent.displayName}
          </div>
          <div
            style={{
              color: C.goldLight,
              fontSize: 28,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {agent.title}
          </div>
          <div
            style={{
              color: C.cream,
              fontSize: 22,
              fontWeight: 600,
              opacity: 0.7,
              marginTop: 6,
            }}
          >
            {licenceLine(agent)}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: SANS,
          ...row(18),
        }}
      >
        <Phone size={50} color={C.gold} strokeWidth={2.2} />
        <span
          style={{
            color: C.cream,
            fontSize: 60,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          {agent.mobile}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: SANS,
          ...row(24),
        }}
      >
        <Mail size={36} color={C.gold} strokeWidth={2.2} />
        <span style={{ color: C.cream, fontSize: 34, fontWeight: 700 }}>
          {agent.email}
        </span>
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          padding: "14px 44px",
          borderRadius: 999,
          background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
          color: C.ink,
          fontFamily: SANS,
          boxShadow: `0 0 ${30 * (pulse - 0.95) * 10}px rgba(248,217,136,0.55)`,
          transform: `scale(${pulse})`,
          opacity: interpolate(frame, [28, 38], [0, 1], clamp),
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 900 }}>{call}</span>
        <span style={{ fontSize: 26, fontWeight: 700 }}>· {callSub}</span>
      </div>
    </CardStage>
  );
};
