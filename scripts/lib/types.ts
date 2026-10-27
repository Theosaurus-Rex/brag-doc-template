import type { AchievementFront, ProjectFront, RoleFront } from "./schema";

export type Issue = { level: "error" | "warning"; file: string; field?: string; message: string };

export type Doc<T> = { file: string; data: T; body: string };

export type Role = Doc<RoleFront> & { employer: string };
export type Project = Doc<ProjectFront> & { id: string; employer: string; slug: string };
export type Achievement = Doc<AchievementFront> & {
  id: string;
  employer: string;
  project?: string;
  story: string;
  notes: string;
};

export type Career = {
  root: string;
  taxonomy: Record<string, string>;
  roles: Role[];
  projects: Project[];
  achievements: Achievement[];
};
