"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEvent,
  Bill,
  ItemAssignment,
  Participant,
  PaymentStatus,
  Split,
} from "@/lib/domain/types";
import { DEMO_ACTIVITY, DEMO_PARTICIPANTS, DEMO_SPLITS, YOU_ID } from "./fixtures";
import { generateId, generateUuid } from "@/lib/utils/id";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as repo from "@/lib/supabase/repository";
import type { User } from "@supabase/supabase-js";

/**
 * Client-side data layer for SquadPay.
 *
 * Two backends live behind the same `useSquadPay()` interface:
 *  - Demo mode (default, and always the fallback): everything lives in
 *    localStorage. This is what runs when Supabase isn't configured, or
 *    nobody's signed in yet.
 *  - Real mode: once Supabase is configured (see lib/supabase/env.ts) AND a
 *    user is signed in, every read/write goes through
 *    lib/supabase/repository.ts instead — real persistence, scoped to that
 *    user by Row Level Security (see supabase/schema.sql).
 *
 * The rest of the app never touches storage or Supabase directly — it only
 * calls the functions this hook returns, so which backend is active is
 * invisible to every page and component.
 */

const STORAGE_KEY = "squadpay-demo-v1";

/**
 * Default state for a genuinely new anonymous visitor — just themselves,
 * nothing else. The sample friends/splits in fixtures.ts (DEMO_PARTICIPANTS
 * etc.) are real, deliberately-authored demo content, but they must never
 * be what a real new user silently starts with — see resetDemoData below
 * for the one explicit, user-triggered way to load them ("Continue in demo
 * mode" on the sign-in page).
 */
const EMPTY_PARTICIPANTS: Participant[] = [{ id: YOU_ID, name: "You", isSelf: true }];

interface PersistedState {
  participants: Participant[];
  splits: Split[];
  activity: ActivityEvent[];
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — demo state just won't persist across reloads.
  }
}

function displayNameFor(user: User): string {
  const meta = user.user_metadata as { name?: string; full_name?: string } | null;
  return meta?.name ?? meta?.full_name ?? user.email?.split("@")[0] ?? "You";
}

/**
 * The three real states the app can be in — kept distinct so the UI (the
 * Profile page especially) never conflates "not configured" with "not
 * signed in". See supabase/env.ts for what "configured" checks.
 */
export type AuthState = "real" | "signed_out" | "no_backend";

interface CreateSplitInput {
  bill: Bill;
  participants: Participant[];
  assignments: ItemAssignment[];
  payerId: string;
}

interface SquadPayContextValue {
  currentUserId: string;
  participants: Participant[];
  splits: Split[];
  activity: ActivityEvent[];
  /** @deprecated prefer `authState` — this is just `authState !== "real"`, kept for the data-layer's own backend selection. */
  isDemoMode: boolean;
  authState: AuthState;
  userEmail: string | null;
  loading: boolean;
  /** How many splits in the local store were actually created by this user (as opposed to seed/demo data) — what "saved on this device" means on the signed-out Profile screen. */
  localSplitCount: number;
  /** Set once, right after a sign-in sync push succeeds with at least one split — for the one-time "N splits synced" confirmation. Not persisted; naturally goes away on the next reload. */
  recentlySyncedCount: number | null;
  createSplit: (input: CreateSplitInput) => Promise<Split>;
  markPaid: (splitId: string, participantId: string) => Promise<void>;
  setPaymentStatus: (
    splitId: string,
    participantId: string,
    status: PaymentStatus,
  ) => Promise<void>;
  recordNudge: (splitId: string, participantId: string) => Promise<void>;
  addParticipant: (name: string) => Promise<Participant>;
  updateDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetDemoData: () => void;
}

const SquadPayContext = createContext<SquadPayContextValue | null>(null);

export function SquadPayProvider({ children }: { children: ReactNode }) {
  const [participants, setParticipants] = useState<Participant[]>(EMPTY_PARTICIPANTS);
  const [splits, setSplits] = useState<Split[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured());
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [recentlySyncedCount, setRecentlySyncedCount] = useState<number | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const authState: AuthState = !supabaseReady ? "no_backend" : user ? "real" : "signed_out";
  const isDemoMode = authState !== "real";

  // --- demo-mode hydration ---
  //
  // Always loads whatever's in localStorage on mount, even when Supabase is
  // configured — on first paint we don't yet know if this visitor is signed
  // in (that's an async check below), so state starts as "demo mode until
  // proven otherwise". If they turn out to be signed in, the real-mode fetch
  // effect further down overwrites participants/splits/activity with their
  // actual Supabase data moments later, so this is never user-visible for
  // long. Skipping this whenever `supabaseReady` was true — the previous
  // behavior — meant `hydrated` never became `true` for a signed-out visitor
  // on a Supabase-enabled deployment (the app's normal configuration, not an
  // edge case), which in turn meant the save-to-localStorage effect right
  // below (gated on `hydrated`) never ran: nothing an anonymous user did was
  // ever actually persisted, even though it rendered fine from React state
  // until the next reload silently dropped it.
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParticipants(persisted.participants);
      setSplits(persisted.splits);
      setActivity(persisted.activity);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (isDemoMode && hydrated) {
      savePersisted({ participants, splits, activity });
    }
  }, [isDemoMode, hydrated, participants, splits, activity]);

  // --- real-mode: track the signed-in user ---
  useEffect(() => {
    if (!supabaseReady) return;
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, [supabaseReady]);

  // --- real-mode: load everything for the signed-in user ---
  const refetchRemote = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !user) return;
    setRemoteLoading(true);
    try {
      const freshParticipants = await repo.fetchParticipants(supabase, displayNameFor(user));
      const byId = new Map(freshParticipants.map((p) => [p.id, p]));
      const [freshSplits, freshActivity] = await Promise.all([
        repo.fetchSplits(supabase, user.id, byId),
        repo.fetchActivity(supabase, user.id),
      ]);
      setParticipants(freshParticipants);
      setSplits(freshSplits);
      setActivity(freshActivity);
    } catch (err) {
      console.error("[squadpay] failed to load data from Supabase:", err);
    } finally {
      setRemoteLoading(false);
    }
  }, [user]);

  // --- local-first: push any not-yet-synced local splits, once, on sign-in ---
  //
  // Deliberately a one-time push, not a background sync engine: read
  // whatever's in localStorage right now, upload anything with a clientId
  // (i.e. actually created by this user, not seed/demo data — see the
  // comment on createSplit) that isn't already marked synced, and mark it.
  // The local copy is never deleted, only tagged — so a failed or partial
  // push loses nothing; it's simply retried the next time this runs (next
  // sign-in, or next load while already signed in).
  //
  // This writes to localStorage directly rather than through
  // setSplits/savePersisted's usual effect, because that effect is gated on
  // `isDemoMode`, which is already false by the time this runs.
  const syncLocalSplitsToSupabase = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;

    const persisted = loadPersisted();
    if (!persisted) return;

    const unsynced = persisted.splits.filter((s) => s.clientId && !s.syncedAt);
    if (unsynced.length === 0) return;

    const nextSplits = [...persisted.splits];
    let syncedCount = 0;

    for (const split of unsynced) {
      try {
        await repo.createSplitRemote(supabase, user.id, {
          bill: split.bill,
          participants: split.participants,
          assignments: split.assignments,
          payerId: split.payerId,
          clientId: split.clientId,
        });
        const idx = nextSplits.findIndex((s) => s.id === split.id);
        if (idx !== -1) {
          nextSplits[idx] = { ...nextSplits[idx], syncedAt: new Date().toISOString() };
        }
        syncedCount += 1;
      } catch (err) {
        // Left unmarked — picked up again next time this runs. Nothing
        // local is deleted or lost on a failed push.
        console.error(`[squadpay] failed to sync split "${split.bill.title}":`, err);
      }
    }

    savePersisted({ ...persisted, splits: nextSplits });
    if (syncedCount > 0) {
      setRecentlySyncedCount(syncedCount);
    }
  }, [user]);

  useEffect(() => {
    // Fetching on mount / when the signed-in user changes — the standard
    // "synchronize with an external system" case the lint rule itself
    // carves out, not the accidental-cascading-render pattern it guards
    // against.
    if (!isDemoMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      syncLocalSplitsToSupabase().then(() => refetchRemote());
    }
  }, [isDemoMode, syncLocalSplitsToSupabase, refetchRemote]);

  // --- mutating actions: demo (local) vs real (Supabase) ---

  const createSplit = useCallback(
    async (input: CreateSplitInput): Promise<Split> => {
      if (!isDemoMode) {
        const supabase = createClient();
        if (!supabase || !user) throw new Error("Not signed in");
        const split = await repo.createSplitRemote(supabase, user.id, input);
        await refetchRemote();
        return split;
      }

      const split: Split = {
        id: generateId("split"),
        // A real UUID, set once and never regenerated — this is what lets
        // this split be pushed to Supabase later (on sign-in) without ever
        // becoming a duplicate row, even if that push is retried. Demo/seed
        // fixture splits deliberately have no clientId, which is also how
        // the sync pass tells "something the user actually created" apart
        // from sample data — see syncLocalSplitsToSupabase below.
        clientId: generateUuid(),
        bill: input.bill,
        participants: input.participants,
        assignments: input.assignments,
        payerId: input.payerId,
        paymentStatus: Object.fromEntries(
          input.participants.map((p) => [p.id, p.id === input.payerId ? "paid" : "pending"]),
        ),
        createdAt: new Date().toISOString(),
      };
      setSplits((prev) => [split, ...prev]);
      setActivity((prev) => [
        {
          id: generateId("act"),
          splitId: split.id,
          type: "created",
          actorName: "You",
          detail: `created split for ${split.bill.title}`,
          amount: split.bill.total,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      return split;
    },
    [isDemoMode, user, refetchRemote],
  );

  const setPaymentStatus = useCallback(
    async (splitId: string, participantId: string, status: PaymentStatus) => {
      if (!isDemoMode) {
        const supabase = createClient();
        if (!supabase) return;
        await repo.setPaymentStatusRemote(supabase, splitId, participantId, status);
        await refetchRemote();
        return;
      }
      setSplits((prev) =>
        prev.map((s) =>
          s.id === splitId
            ? { ...s, paymentStatus: { ...s.paymentStatus, [participantId]: status } }
            : s,
        ),
      );
    },
    [isDemoMode, refetchRemote],
  );

  const markPaid = useCallback(
    async (splitId: string, participantId: string) => {
      const person = participants.find((p) => p.id === participantId);

      if (!isDemoMode) {
        const supabase = createClient();
        if (!supabase || !user) return;
        await repo.setPaymentStatusRemote(supabase, splitId, participantId, "paid");
        if (person) {
          await repo.logActivity(supabase, user.id, {
            splitId,
            type: "settled",
            actorName: person.name,
            detail: "settled their share",
          });
        }
        await refetchRemote();
        return;
      }

      await setPaymentStatus(splitId, participantId, "paid");
      if (person) {
        setActivity((prev) => [
          {
            id: generateId("act"),
            splitId,
            type: "settled",
            actorName: person.name,
            detail: "settled their share",
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    [isDemoMode, user, participants, setPaymentStatus, refetchRemote],
  );

  const recordNudge = useCallback(
    async (splitId: string, participantId: string) => {
      const split = splits.find((s) => s.id === splitId);
      const alreadyPaid = split?.paymentStatus[participantId] === "paid";
      const person = participants.find((p) => p.id === participantId);

      if (!isDemoMode) {
        const supabase = createClient();
        if (!supabase || !user) return;
        if (!alreadyPaid) {
          await repo.setPaymentStatusRemote(supabase, splitId, participantId, "reminder_sent");
        }
        await repo.logActivity(supabase, user.id, {
          splitId,
          type: "nudged",
          actorName: "You",
          detail: `nudged ${person?.name ?? "a friend"}`,
        });
        await refetchRemote();
        return;
      }

      setSplits((prev) =>
        prev.map((s) => {
          if (s.id !== splitId) return s;
          if (s.paymentStatus[participantId] === "paid") return s;
          return {
            ...s,
            paymentStatus: { ...s.paymentStatus, [participantId]: "reminder_sent" },
          };
        }),
      );
      setActivity((prev) => [
        {
          id: generateId("act"),
          splitId,
          type: "nudged",
          actorName: "You",
          detail: `nudged ${person?.name ?? "a friend"}`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [isDemoMode, user, splits, participants, refetchRemote],
  );

  const addParticipant = useCallback(
    async (name: string): Promise<Participant> => {
      if (!isDemoMode) {
        const supabase = createClient();
        if (!supabase || !user) throw new Error("Not signed in");
        const person = await repo.addContact(supabase, user.id, name);
        await refetchRemote();
        return person;
      }
      const person: Participant = { id: generateId("p"), name };
      setParticipants((prev) => [...prev, person]);
      return person;
    },
    [isDemoMode, user, refetchRemote],
  );

  const updateDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      if (authState === "real") {
        const supabase = createClient();
        if (!supabase) return;
        const { data, error } = await supabase.auth.updateUser({ data: { name: trimmed } });
        if (error) throw error;
        if (data.user) setUser(data.user);
      }

      // Update locally either way — this is what every "You" avatar/name in
      // the app reads from, in both real and demo mode.
      setParticipants((prev) =>
        prev.map((p) => (p.id === YOU_ID ? { ...p, name: trimmed } : p)),
      );
    },
    [authState],
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  // Seeds the sample demo dataset — the one explicit, user-triggered path
  // to it (see app/login/page.tsx's "Continue in demo mode"). Deliberately
  // a no-op if the visitor already has real local history (their own added
  // people and/or splits): this must never clobber a returning anonymous
  // user's actual data. Checked via localStorage directly, not the
  // `participants`/`splits` state, because the persist effect above writes
  // the empty default shell (just "You", no splits) to localStorage almost
  // immediately on every load — that shell existing is not "real data".
  const resetDemoData = useCallback(() => {
    const persisted = loadPersisted();
    const hasRealData = persisted && (persisted.splits.length > 0 || persisted.participants.length > 1);
    if (hasRealData) return;
    setParticipants(DEMO_PARTICIPANTS);
    setSplits(DEMO_SPLITS);
    setActivity(DEMO_ACTIVITY);
  }, []);

  const localSplitCount = useMemo(
    () => splits.filter((s) => s.clientId).length,
    [splits],
  );

  const value = useMemo<SquadPayContextValue>(
    () => ({
      currentUserId: YOU_ID,
      participants,
      splits,
      activity,
      isDemoMode,
      authState,
      userEmail: user?.email ?? null,
      loading: supabaseReady && !authChecked ? true : remoteLoading,
      localSplitCount,
      recentlySyncedCount,
      createSplit,
      markPaid,
      setPaymentStatus,
      recordNudge,
      addParticipant,
      updateDisplayName,
      signOut,
      resetDemoData,
    }),
    [
      participants,
      splits,
      activity,
      isDemoMode,
      authState,
      user,
      supabaseReady,
      authChecked,
      remoteLoading,
      localSplitCount,
      recentlySyncedCount,
      createSplit,
      markPaid,
      setPaymentStatus,
      recordNudge,
      addParticipant,
      updateDisplayName,
      signOut,
      resetDemoData,
    ],
  );

  return <SquadPayContext.Provider value={value}>{children}</SquadPayContext.Provider>;
}

export function useSquadPay(): SquadPayContextValue {
  const ctx = useContext(SquadPayContext);
  if (!ctx) {
    throw new Error("useSquadPay must be used within <SquadPayProvider>");
  }
  return ctx;
}
