import { matchesSearchQuery } from "@/lib/searchComboboxFilter";

export type UserSearchRow = {
  fullName: string;
  phone?: string | null;
  usernameEmail: string;
  role: string;
  roleLabel?: string;
};

export function buildUserSearchText(user: UserSearchRow): string {
  const parts = [user.fullName, user.phone, user.usernameEmail, user.role];
  if (user.roleLabel) parts.push(user.roleLabel);
  return parts.filter(Boolean).join(" ");
}

export function matchesUserSearch(user: UserSearchRow, query: string): boolean {
  return matchesSearchQuery(buildUserSearchText(user), query);
}
