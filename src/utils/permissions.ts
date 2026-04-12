import type { UserProfile } from "../types/user";

export function canManageCategory(
  profile: UserProfile | null,
  category: string
): boolean {
  if (!profile) return false;
  if (profile.admin) return true;
  return (profile.coachCategories ?? []).includes(category);
}
