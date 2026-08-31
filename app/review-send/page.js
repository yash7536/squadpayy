import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabaseServer";
import ReviewSendClient from "./ReviewSendClient";

export const dynamic = "force-dynamic";

// "Send requests" writes to Supabase under the signed-in sender's own
// account, so this screen requires a session — anyone not signed in is
// sent to /login and back here afterward.
export default async function ReviewSendPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/review-send");
  }

  return <ReviewSendClient />;
}
