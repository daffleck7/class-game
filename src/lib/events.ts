/**
 * Event deck definitions for the class-game icebreaker.
 *
 * Each event has multiplier effects on the 5 business categories.
 * Positive multipliers reward allocation; negative multipliers penalise it.
 */

export const CATEGORIES = [
  "rd",
  "security",
  "compatibility",
  "marketing",
  "partnerships",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface GameEvent {
  title: string;
  description: string;
  effects: Record<Category, number>;
}

export const ALL_EVENTS: GameEvent[] = [
  {
    title: "Breakthrough Innovation",
    description: "Your R&D lab strikes gold with a revolutionary discovery.",
    effects: { rd: 2.5, security: 0, compatibility: 0, marketing: 0.5, partnerships: 0 },
  },
  {
    title: "Data Breach",
    description: "Hackers exploit companies with weak defenses.",
    effects: { rd: -0.5, security: 3.0, compatibility: 0, marketing: -1.0, partnerships: 0 },
  },
  {
    title: "Industry Standard Shift",
    description: "New compatibility requirements sweep the market.",
    effects: { rd: 0, security: 0, compatibility: 2.5, marketing: 0, partnerships: 1.0 },
  },
  {
    title: "Viral Campaign",
    description: "Your product goes viral on social media overnight.",
    effects: { rd: 0, security: 0, compatibility: 0.5, marketing: 3.0, partnerships: 0.5 },
  },
  {
    title: "Strategic Alliance",
    description: "A major industry player wants to partner with you.",
    effects: { rd: 0, security: 0, compatibility: 0.5, marketing: 0.5, partnerships: 3.0 },
  },
  {
    title: "Market Crash",
    description: "An economic downturn hits everyone hard.",
    effects: { rd: -0.5, security: 0.5, compatibility: 0, marketing: -1.5, partnerships: -1.0 },
  },
  {
    title: "Copycat Competitor",
    description: "A rival company clones your flagship product.",
    effects: { rd: 1.5, security: 0, compatibility: -1.0, marketing: 1.0, partnerships: -0.5 },
  },
  {
    title: "Government Regulation",
    description: "New compliance laws reshape the industry landscape.",
    effects: { rd: 0, security: 2.0, compatibility: 1.5, marketing: -0.5, partnerships: 0 },
  },
  {
    title: "Tech Conference Buzz",
    description: "The industry spotlight lands on your company.",
    effects: { rd: 0.5, security: 0, compatibility: 0.5, marketing: 1.5, partnerships: 1.5 },
  },
  {
    title: "Supply Chain Crisis",
    description: "A global disruption tests your key partnerships.",
    effects: { rd: -1.0, security: 0, compatibility: -0.5, marketing: 0, partnerships: 2.5 },
  },
];
