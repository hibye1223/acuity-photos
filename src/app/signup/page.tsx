import { redirect } from "next/navigation";
import { SignupForm } from "~/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/app");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Sign up with your email and a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
