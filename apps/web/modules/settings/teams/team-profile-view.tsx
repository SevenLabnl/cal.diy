"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import { Form, Label, TextArea, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";

import type { Team } from "./team-page";
import { TeamPage } from "./team-page";

type FormValues = { name: string; slug: string; bio: string; logo: string | null };

const ProfileForm = ({ team, canManage }: { team: Team; canManage: boolean }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({
    defaultValues: { name: team.name, slug: team.slug ?? "", bio: team.bio ?? "", logo: team.logoUrl },
  });
  const {
    formState: { isDirty, dirtyFields },
  } = form;

  const mutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async (updated) => {
      await Promise.all([
        utils.viewer.teams.get.invalidate({ teamId: team.id }),
        utils.viewer.teams.list.invalidate(),
      ]);
      form.reset({
        name: updated.name,
        slug: updated.slug ?? "",
        bio: updated.bio ?? "",
        logo: updated.logoUrl,
      });
      showToast(t("team_updated_successfully"), "success");
    },
    onError: (e) => showToast(t(e.message), "error"),
  });

  return (
    <Form
      form={form}
      handleSubmit={({ name, slug, bio, logo }) =>
        mutation.mutate({
          id: team.id,
          name,
          slug,
          bio,
          // only send the logo when it changed: an unchanged value is a URL, not an upload
          ...(dirtyFields.logo ? { logo } : {}),
        })
      }>
      <div className="border-subtle border-x px-4 py-8 sm:px-6">
        <Controller
          control={form.control}
          name="logo"
          render={({ field: { value, onChange } }) => (
            <div className="flex items-center">
              <Avatar alt={team.name} imageSrc={value} size="lg" />
              {canManage && (
                <div className="ms-4 flex gap-2">
                  <ImageUploader
                    target="logo"
                    id="team-logo-upload"
                    buttonMsg={t("upload_logo")}
                    handleAvatarChange={onChange}
                    imageSrc={value ?? undefined}
                  />
                  {value && (
                    <Button color="minimal" onClick={() => onChange(null)}>
                      {t("remove_logo")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        />
        <div className="mt-8">
          <TextField label={t("team_name")} disabled={!canManage} {...form.register("name")} />
        </div>
        <div className="mt-8">
          <TextField
            label={t("team_url")}
            disabled={!canManage}
            addOnLeading={`${WEBAPP_URL}/team/`}
            {...form.register("slug", { onChange: (e) => form.setValue("slug", slugify(e.target.value, true)) })}
          />
        </div>
        <div className="mt-8">
          <Label>{t("about")}</Label>
          <TextArea rows={4} disabled={!canManage} {...form.register("bio")} />
          <p className="mt-2 text-subtle text-sm">{t("team_description")}</p>
        </div>
      </div>
      <SectionBottomActions align="end">
        {canManage && (
          <Button loading={mutation.isPending} disabled={!isDirty} color="primary" type="submit">
            {t("update")}
          </Button>
        )}
      </SectionBottomActions>
    </Form>
  );
};

const DangerZone = ({ team, isOwner }: { team: Team; isOwner: boolean }) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onDone = async (message: string) => {
    await utils.viewer.teams.list.invalidate();
    showToast(message, "success");
    router.push("/teams");
  };
  const onError = (e: { message: string }) => showToast(t(e.message), "error");

  const leave = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => onDone(t("team_left")),
    onError,
  });
  const remove = trpc.viewer.teams.delete.useMutation({
    onSuccess: () => onDone(t("team_deleted")),
    onError,
  });

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Label className="mb-0 font-semibold text-base text-red-700">{t("danger_zone")}</Label>
      <div className="flex gap-2">
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogTrigger asChild>
            <Button color="destructive" StartIcon="log-out" data-testid="leave-team">
              {t("leave_team")}
            </Button>
          </DialogTrigger>
          <ConfirmationDialogContent
            variety="danger"
            title={t("leave_team")}
            confirmBtnText={t("confirm_leave_team")}
            isPending={leave.isPending}
            onConfirm={(e) => {
              e.preventDefault();
              leave.mutate({ teamId: team.id, accept: false });
            }}>
            {t("leave_team_confirmation_message")}
          </ConfirmationDialogContent>
        </Dialog>
        {isOwner && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button color="destructive" StartIcon="trash" data-testid="delete-team">
                {t("disband_team")}
              </Button>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("disband_team")}
              confirmBtnText={t("confirm")}
              isPending={remove.isPending}
              onConfirm={(e) => {
                e.preventDefault();
                remove.mutate({ teamId: team.id });
              }}>
              {t("disband_team_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

const TeamProfileView = () => {
  const { t } = useLocale();
  return (
    <TeamPage title={t("profile")} description={t("profile_team_description")}>
      {(team, { canManage, isOwner }) => (
        <>
          <ProfileForm key={team.id} team={team} canManage={canManage} />
          <DangerZone team={team} isOwner={isOwner} />
        </>
      )}
    </TeamPage>
  );
};

export default TeamProfileView;
