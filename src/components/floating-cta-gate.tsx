import { FloatingCta } from "~/components/floating-cta";
import { createClient } from "~/lib/supabase/server";

/**
 * FloatingCta is marketing chrome ("Fix your photos" -> /signup) and only
 * makes sense for signed-out visitors. It's rendered globally from the root
 * layout, so this gate hides it once a user is signed in rather than
 * duplicating the auth check into every page.
 */
export async function FloatingCtaGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return null;

  return <FloatingCta />;
}
