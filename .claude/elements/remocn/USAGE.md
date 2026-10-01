# remocn components — usage notes

remocn (https://remocn.dev) is a registry of ~240 copy-paste Remotion components installed with the
`shadcn` CLI into `components/remocn/`. The full library is vendored in this folder (see CATALOG.md); these are
Daniel's saved usage examples (2026-09-25). The `remocn` skill in `.claude/skills/remocn/` explains
the catalog (start at https://remocn.dev/llms-components.txt). Installing a component downloads its
code from remocn.dev — ask Daniel first, check its licence, then adapt it like any Element
(Be Vietnam Pro, brand tokens from `src/brand/theme.ts`, no own `<Audio>`).

## Drift — slow push-in on any scene

Fits: a subtle zoom on a still, a cover, or a quiet talking-head stretch.

```tsx
import { Drift } from "@/components/remocn/drift";

export const MyScene = () => (
  <Drift grow={0.035}>
    <YourScene />
  </Drift>
);
```

## Stage — a long page scrolled on a 3D tilted screen

Fits: showing a long document or web page (a lender policy page, a fact sheet) as a screenshot.
Screenshots of third-party sites need permission and must not suggest a lender endorses the video.

```tsx
import { Easing, Img, staticFile } from "remotion";
import { Stage } from "@/components/remocn/stage";

<Stage
  contentSize={{ width: 1265, height: 10022 }}
  moves={[
    { at: 0, x: 0.5, y: 0.035, zoom: 1.04 },
    { at: 30, x: 0.5, y: 0.07052, zoom: 1.04, easing: Easing.in(Easing.cubic) },
    { at: 269, x: 0.5, y: 0.91948, zoom: 1.04, easing: Easing.linear },
    { at: 299, x: 0.5, y: 0.955, zoom: 1.04, easing: Easing.out(Easing.cubic) },
  ]}
  shake={0}
  seed={"remocn-smooth-descent"}
  backdrop={"linear-gradient(145deg, #17181d 0%, #09090b 72%)"}
  rotateX={14}
  rotateY={-20}
  perspective={900}
  scale={0.86}
  radius={1.4}
  reflection={0.24}
  shadow={0.7}
  light={0.55}
>
  <Img src={staticFile("your-long-page.png")} style={{ width: "100%", height: "100%" }} />
</Stage>
```

## ChatToPreviewLayout — chat panel beside an app preview

Fits: software/AI demos (landscape 1280×720). Not a fit for Daniel's talking-head videos.

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { ChatToPreviewLayout } from "@/components/remocn/chat-to-preview-layout";

const AgentScene = () => (
  <ChatToPreviewLayout
    chat={<YourConversation />}
    preview={<YourAppPreview />}
    startChatRatio={0.5}
    endChatRatio={0.25}
  />
);

export const RemotionRoot = () => (
  <Composition
    id="ChatToPreviewLayout"
    component={AgentScene}
    durationInFrames={120}
    fps={30}
    width={1280}
    height={720}
  />
);
```
