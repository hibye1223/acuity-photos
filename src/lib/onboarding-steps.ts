export type OnboardingStep = {
  id: string;
  path: string;
  /** Matches a `data-tour` attribute on the element to spotlight. Omit for a centered, non-spotlit card. */
  target?: string;
  title: string;
  description: string;
};

/**
 * Add a new step here whenever a feature is shipped that new users should be
 * walked through. Steps play in order; each navigates to `path` first, then
 * spotlights the element carrying `data-tour="<target>"` on that page.
 */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    path: "/app",
    title: "Welcome to Acuity Photos",
    description:
      "Here's a quick look at what you can do. Takes about 30 seconds.",
  },
  {
    id: "ai-assistant",
    path: "/app",
    target: "ai-assistant",
    title: "Build an album with AI",
    description:
      "Describe the album you want in plain language and the AI Album Assistant pulls together a draft for you to refine.",
  },
  {
    id: "upload",
    path: "/app/upload",
    target: "upload",
    title: "Upload your photos",
    description: "Bring your photos in so they're ready to organize.",
  },
  {
    id: "gallery",
    path: "/app/photos",
    target: "gallery",
    title: "Browse your gallery",
    description: "Every photo you've uploaded, all in one place.",
  },
  {
    id: "albums",
    path: "/app/albums",
    target: "albums",
    title: "Your albums",
    description: "Albums you've built or saved show up here.",
  },
  {
    id: "done",
    path: "/app/albums",
    title: "That's everything",
    description: "You're all set. Come back to this anytime from the app.",
  },
];
