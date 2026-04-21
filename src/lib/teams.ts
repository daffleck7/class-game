export const TEAMS = [1, 2, 4, 5, 6] as const;
export type TeamNumber = (typeof TEAMS)[number];

export const TEAM_NAMES: Record<number, string> = {
  1: "Team 1",
  2: "Team 2",
  4: "Team 4",
  5: "Team 5",
  6: "Team 6",
};

export const TEAM_COLORS: Record<number, string> = {
  1: "bg-wine-600",
  2: "bg-blue-800",
  4: "bg-forest-800",
  5: "bg-gold-500",
  6: "bg-purple-900",
};

export const TEAM_BORDER_COLORS: Record<number, string> = {
  1: "border-wine-600",
  2: "border-blue-800",
  4: "border-forest-800",
  5: "border-gold-500",
  6: "border-purple-900",
};
