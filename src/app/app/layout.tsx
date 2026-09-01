import { redirect } from "next/navigation";
import { OnboardingTour } from "~/components/onboarding-tour";
import { createClient } from "~/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/create");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  return (
    <>
      {children}
      <OnboardingTour
        initiallyCompleted={profile?.onboarding_completed ?? true}
      />
    </>
  );
}
