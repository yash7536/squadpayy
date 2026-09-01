import Button from "@/components/Button";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Matches the "Home" screen of the Figma prototype (node 1:11).
//
// The Figma design has no login/logout affordance at all (it predates
// auth entirely). For a signed-in sender, this adds one small line above
// the existing content — nothing else moves or changes. An anonymous
// visitor sees exactly the same page as before, pixel-for-pixel.
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pt-16">
      {user && (
        <div className="mb-4 flex items-center justify-between text-sm text-[#737373]">
          <span className="truncate">Signed in as {user.email}</span>
          <LogoutButton />
        </div>
      )}

      <p className="text-2xl font-semibold text-black">SquadPay</p>

      <h1 className="mt-10 text-[28px] font-semibold leading-tight text-black">
        Get paid without the awkward conversation
      </h1>

      <p className="mt-[21px] text-base text-black">
        Upload a bill, split it with your group, and let SquadPay handle the
        follow-up
      </p>

      <div className="flex-1" />

      <Button href="/add-bill" variant="primary" className="mx-auto mb-14 h-[52px] w-[300px]">
        Upload a bill
      </Button>
    </div>
  );
}
