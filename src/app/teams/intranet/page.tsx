import TeamsLandingPage from "@/components/TeamsLandingPage";

const INTRANET_PORTAL_URL =
  process.env.NEXT_PUBLIC_INTRANET_PORTAL_URL || "https://peopleusahope.sharepoint.com/sites/PeopleUSA";

export default function TeamsIntranetPage() {
  return (
    <TeamsLandingPage
      title="Intranet"
      description="Open the People USA Intranet to access internal resources and information."
      buttonLabel="Open Intranet"
      externalUrl={INTRANET_PORTAL_URL}
      iconSrc="/icons/intranet.png"
      iconAlt="Intranet"
    />
  );
}
