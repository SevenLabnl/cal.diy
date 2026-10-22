import { _generateMetadata } from "app/_utils";

import TeamMembersView from "~/settings/teams/team-members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("members"),
    (t) => t("members_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/members`
  );

const Page = () => <TeamMembersView />;

export default Page;
