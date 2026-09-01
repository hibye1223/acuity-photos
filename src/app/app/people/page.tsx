import Link from "next/link";
import { redirect } from "next/navigation";
import { suggestPeopleGroups } from "~/app/actions/people";
import { PeopleReview } from "~/components/people/people-review";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/people");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("face_grouping_enabled")
    .eq("id", user.id)
    .single();

  if (!profile?.face_grouping_enabled) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          Turn on "Suggest people groupings" in Settings to have the AI notice
          photos that might show the same person for you to label.
        </p>
        <Button asChild className="w-fit">
          <Link href="/app/settings">Go to Settings</Link>
        </Button>
      </main>
    );
  }

  const groups = await suggestPeopleGroups();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          Photos the AI thinks might show the same person, based on physical
          appearance only — nobody's identity is guessed. Name a group to apply
          it, or skip if it's wrong.
        </p>
      </div>
      <PeopleReview initialGroups={groups} />
    </main>
  );
}
