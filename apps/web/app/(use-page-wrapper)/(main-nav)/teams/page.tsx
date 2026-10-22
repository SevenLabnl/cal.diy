import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamsCTA, TeamsList } from "~/settings/teams/teams-list-view";
import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/teams"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/teams");
  }

  const t = await getTranslate();

  return (
    <ShellMainAppDir
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      CTA={<TeamsCTA />}>
      <TeamsList />
    </ShellMainAppDir>
  );
};

export default Page;
