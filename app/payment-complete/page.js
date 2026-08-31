import { redirect } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getLatestBillWithRequests } from "@/lib/paymentRequestsDb";

export const dynamic = "force-dynamic";

// Matches the "Payment Complete" screen of the Figma prototype (node 1:3).
//
// The total and participant count are read from Supabase, scoped to the
// signed-in sender's own bill — not hardcoded, and not visible to any
// other user.
export default async function PaymentComplete() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/payment-complete");
  }

  const bill = await getLatestBillWithRequests({ supabase, ownerId: user.id });

  if (!bill) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Payment complete" backHref="/payment-status" />
        <p className="mt-[14px] text-sm text-black">
          No payment requests yet — send some from Review &amp; Send first.
        </p>
      </div>
    );
  }

  const { billLabel, totalAmount, requests } = bill;
  const allPaid = requests.every((request) => request.status === "paid");

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Payment complete" backHref="/payment-status" />

      <p className="mt-[14px] text-sm text-black">
        {allPaid
          ? "You’re all settled."
          : "Almost there — not everyone has paid yet."}
      </p>
      <p className="mt-[7px] text-2xl font-semibold text-black">
        Rs.{totalAmount.toLocaleString("en-IN")}
      </p>
      <p className="mt-[4px] text-sm text-black">
        {allPaid
          ? "Everyone has paid their share."
          : "Check Payment Status for who’s still pending."}
      </p>

      <div className="mt-[37px] flex h-14 w-full items-center justify-between rounded-[10px] bg-[#D9D9D9] px-4 text-black">
        <div className="flex flex-col">
          <span className="text-base leading-tight">{billLabel}</span>
          <span className="text-xs leading-tight">
            {requests.length} people
          </span>
        </div>
        <span className="text-xs">Rs.{totalAmount.toLocaleString("en-IN")}</span>
      </div>

      <Button href="/" variant="dark" className="mt-[26px] h-14 w-full">
        Done
      </Button>
    </div>
  );
}
