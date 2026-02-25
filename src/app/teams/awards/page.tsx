import TeamsLandingPage from "@/components/TeamsLandingPage";

const AWARDS_PORTAL_URL =
  process.env.NEXT_PUBLIC_AWARDS_PORTAL_URL || "https://peopleusa.footholdtechnology.com/zf2/login";

export default function TeamsAwardsPage() {
  return (
    <TeamsLandingPage
      title="Awards"
      description="Open the Awards portal to view and manage recognition and awards."
      buttonLabel="Open Awards Portal"
      externalUrl={AWARDS_PORTAL_URL}
      iconSrc="/icons/awards.png"
      iconAlt="Awards"
    />
  );
}
