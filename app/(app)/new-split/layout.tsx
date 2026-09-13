import { SplitDraftProvider } from "@/lib/data/draft-context";

export default function NewSplitLayout({ children }: { children: React.ReactNode }) {
  return <SplitDraftProvider>{children}</SplitDraftProvider>;
}
