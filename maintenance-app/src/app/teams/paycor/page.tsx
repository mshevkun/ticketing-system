import TeamsLandingPage from "@/components/TeamsLandingPage";

const PAYCOR_PORTAL_URL =
  process.env.NEXT_PUBLIC_PAYCOR_PORTAL_URL || "https://hcm.paycor.com/authentication/signin";

export default function TeamsPaycorPage() {
  return (
    <TeamsLandingPage
      title="Paycor"
      description="Open the Paycor portal to access HR and payroll."
      buttonLabel="Open Paycor Portal"
      externalUrl={PAYCOR_PORTAL_URL}
      iconSrc="/icons/Paycor.png"
      iconAlt="Paycor"
    />
  );
}
