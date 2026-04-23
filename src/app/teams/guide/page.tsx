import TeamsLandingPage from "@/components/TeamsLandingPage";

/** SharePoint folder / awards guide (same target as the Guide Teams app). Override in Vercel if the link changes. */
const AWARDS_GUIDE_PORTAL_URL =
  process.env.NEXT_PUBLIC_AWARDS_GUIDE_URL ||
  "https://peopleusahope.sharepoint.com/sites/PEOPLeProjectstoEmpowerandOrganizethePsychiatricallyLabeledI/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FPEOPLeProjectstoEmpowerandOrganizethePsychiatricallyLabeledI%2FShared%20Documents%2FGeneral%2FAWARDS%20general&p=true";

export default function TeamsGuidePage() {
  return (
    <TeamsLandingPage
      title="Guide"
      description="Awards Guide: browse awards, eligibility, deadlines, and nomination materials. Open the portal for the full SharePoint library."
      buttonLabel="Open Awards Guide"
      externalUrl={AWARDS_GUIDE_PORTAL_URL}
      iconSrc="/icons/guide.png"
      iconAlt="Guide"
    />
  );
}
