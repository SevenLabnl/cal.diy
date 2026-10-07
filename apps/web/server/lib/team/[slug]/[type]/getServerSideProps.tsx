import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getBrandingForEventType } from "@calcom/features/profile/lib/getBranding";
import { shouldHideBrandingForTeamEvent } from "@calcom/features/profile/lib/hideBranding";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { params, query } = context;
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { rescheduleUid } = query;
  const allowRescheduleForCancelledBooking = query.allowRescheduleForCancelledBooking === "true";

  const team = await getTeamWithEventsData(teamSlug, meetingSlug);

  if (!team || !team.eventTypes?.[0]) {
    return { notFound: true } as const;
  }

  const eventData = team.eventTypes[0];

  if (eventData.schedulingType === SchedulingType.MANAGED) {
    return { notFound: true } as const;
  }

  if (rescheduleUid && eventData.disableRescheduling) {
    return { redirect: { destination: `/booking/${rescheduleUid}`, permanent: false } };
  }

  const booking = rescheduleUid
    ? await getServerSession({ req: context.req }).then((session) =>
        getBookingForReschedule(`${rescheduleUid}`, session?.user?.id)
      )
    : null;

  if (
    booking?.status === BookingStatus.CANCELLED &&
    !allowRescheduleForCancelledBooking &&
    !eventData.allowReschedulingCancelledBookings
  ) {
    return {
      redirect: {
        permanent: false,
        destination: `/team/${teamSlug}/${meetingSlug}`,
      },
    };
  }

  const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
  const teamMemberEmail = Array.isArray(crmContactOwnerEmail)
    ? crmContactOwnerEmail[0]
    : crmContactOwnerEmail;

  const eventTypeId = eventData.id;
  const branding = getBrandingForEventType({
    eventType: { team, users: [], profile: null },
  });

  return {
    props: {
      // Slots for team events are always served by the web tRPC router (API v2 is not deployed)
      useApiV2: false,
      eventData: {
        eventTypeId,
        entity: {
          fromRedirectOfNonOrgLink: false,
          considerUnpublished: !team.slug,
          orgSlug: null,
          teamSlug: team.slug ?? null,
          name: team.name ?? null,
        },
        length: eventData.length,
        metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
        profile: {
          image: getPlaceholderAvatar(team.logoUrl, team.name),
          name: team.name ?? null,
          username: null,
          ...branding,
        },
        title: eventData.title,
        users: team.isPrivate
          ? []
          : eventData.hosts
              .filter((h) => h.user.username)
              .map((h) => ({ username: h.user.username ?? "", name: h.user.name ?? "" })),
        hidden: eventData.hidden,
        interfaceLanguage: eventData.interfaceLanguage,
      },
      booking,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      isBrandingHidden: shouldHideBrandingForTeamEvent({
        eventTypeId,
        team: { ...team, parent: null },
      }),
      themeBasis: null,
      orgBannerUrl: "",
      teamMemberEmail,
      isSEOIndexable: false,
    },
  };
};

const getTeamWithEventsData = async (teamSlug: string, meetingSlug: string) => {
  return await prisma.team.findFirst({
    where: { slug: teamSlug, parentId: null },
    select: {
      id: true,
      isPrivate: true,
      hideBranding: true,
      logoUrl: true,
      name: true,
      slug: true,
      brandColor: true,
      darkBrandColor: true,
      theme: true,
      eventTypes: {
        where: {
          slug: meetingSlug,
        },
        select: {
          id: true,
          title: true,
          schedulingType: true,
          metadata: true,
          length: true,
          hidden: true,
          disableRescheduling: true,
          allowReschedulingCancelledBookings: true,
          interfaceLanguage: true,
          hosts: {
            take: 3,
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });
};
