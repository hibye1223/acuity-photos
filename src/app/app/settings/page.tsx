import { redirect } from "next/navigation";
import { AiPreferencesForm } from "~/components/account/ai-preferences-form";
import { ChangePasswordForm } from "~/components/account/change-password-form";
import { DeleteAccountButton } from "~/components/account/delete-account-button";
import { ProfileForm } from "~/components/account/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DEFAULT_CAPTION_STYLE,
  isCaptionStyle,
} from "~/lib/ai/album-assistant";
import { createClient } from "~/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, default_caption_style, challenge_me")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Signed in as {user.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={user.id}
            initialFullName={profile?.full_name ?? null}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            Set a new password for your account. There's no way to view your
            current password — it's never stored in a readable form — but if
            you're locked out,{" "}
            <a href="/forgot-password" className="underline">
              reset it by email
            </a>{" "}
            instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Album Assistant defaults</CardTitle>
          <CardDescription>
            Applied automatically every time you open the Create page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiPreferencesForm
            initialCaptionStyle={
              isCaptionStyle(profile?.default_caption_style)
                ? profile.default_caption_style
                : DEFAULT_CAPTION_STYLE
            }
            initialChallengeMe={profile?.challenge_me ?? false}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Delete account</CardTitle>
          <CardDescription>
            Permanently delete your account, photos, and albums. This can't be
            undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </main>
  );
}
