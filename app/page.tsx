import { redirect } from "next/navigation";

export default function RootPage() {
  // Auth gating (when Supabase is configured) happens in middleware.ts;
  // this route is just the entry point into the app shell.
  redirect("/home");
}
