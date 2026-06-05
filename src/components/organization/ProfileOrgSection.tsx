import type { UserOrgProfile } from "@/types/organization";
import { OrgProfileBadges } from "./OrgProfileBadges";

type OrgDict = {
  sectionTitle: string;
  deptManager: string;
  teamLeader: string;
  teamMember: string;
  supervisorTitle: string;
  supervisorTeamLeader: string;
  supervisorDeptManager: string;
  noOrg: string;
};

type Props = {
  profile: UserOrgProfile;
  dict: OrgDict;
};

/** Sekcja profilu: pozycja w strukturze + łańcuch przełożenia. */
export function ProfileOrgSection({ profile, dict }: Props) {
  const hasBadges =
    profile.deptManagerOf.length > 0 ||
    profile.teamLeaderOf.length > 0 ||
    profile.teamMemberships.some((m) => m.role !== "leader");

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{dict.sectionTitle}</h3>
      {hasBadges ? (
        <OrgProfileBadges
          profile={profile}
          labels={{
            deptManager: dict.deptManager,
            teamLeader: dict.teamLeader,
            teamMember: dict.teamMember,
          }}
        />
      ) : (
        <p className="text-sm text-zinc-500">{dict.noOrg}</p>
      )}
      {profile.supervisorChain.length > 0 ? (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 mb-1.5">{dict.supervisorTitle}</p>
          <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {profile.supervisorChain.map((s) => (
              <li key={`${s.kind}-${s.userId}`}>
                {s.kind === "team_leader" ? dict.supervisorTeamLeader : dict.supervisorDeptManager}:{" "}
                <span className="font-medium">{s.fullName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
