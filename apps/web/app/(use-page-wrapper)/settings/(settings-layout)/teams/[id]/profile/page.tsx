import { _generateMetadata } from "app/_utils";

import TeamProfileView from "~/settings/teams/team-profile-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/profile`
  );

const Page = () => <TeamProfileView />;

export default Page;
