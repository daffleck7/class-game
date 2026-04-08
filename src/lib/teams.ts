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
  1: "bg-red-600",
  2: "bg-blue-600",
  4: "bg-green-600",
  5: "bg-yellow-600",
  6: "bg-purple-600",
};

export const TEAM_BORDER_COLORS: Record<number, string> = {
  1: "border-red-600",
  2: "border-blue-600",
  4: "border-green-600",
  5: "border-yellow-600",
  6: "border-purple-600",
};
