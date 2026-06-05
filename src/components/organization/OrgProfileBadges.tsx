import type { UserOrgProfile } from "@/types/organization";
import { formatDict } from "@/i18n/format";

export type OrgBadgeLabels = {
  deptManager: string;
  teamLeader: string;
  teamMember: string;
};

export function buildOrgBadgeItems(
  profile: UserOrgProfile | undefined,
  labels: OrgBadgeLabels
): string[] {
  if (!profile) return [];
  const items: string[] = [];
  for (const d of profile.deptManagerOf) {
    items.push(formatDict(labels.deptManager, { name: d.name }));
  }
  for (const t of profile.teamLeaderOf) {
    items.push(formatDict(labels.teamLeader, { name: t.name }));
  }
  for (const m of profile.teamMemberships) {
    if (m.role === "leader") continue;
    items.push(formatDict(labels.teamMember, { name: m.name }));
  }
  return items;
}

type Props = {
  profile: UserOrgProfile | undefined;
  labels: OrgBadgeLabels;
  className?: string;
};

/** Chipy pozycji w strukturze organizacyjnej. */
export function OrgProfileBadges({ profile, labels, className = "" }: Props) {
  const items = buildOrgBadgeItems(profile, labels);
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((label) => (
        <span
          key={label}
          className="inline-flex max-w-full items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 truncate"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
