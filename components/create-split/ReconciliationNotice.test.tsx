import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReconciliationNotice } from "./ReconciliationNotice";
import type { ReconciliationResult } from "@/lib/domain/reconciliation";

function makeResult(overrides: Partial<ReconciliationResult> = {}): ReconciliationResult {
  return {
    itemsTotal: 900,
    computedTotal: 990,
    extractedTotal: 990,
    difference: 0,
    applicable: true,
    reconciled: true,
    ...overrides,
  };
}

describe("ReconciliationNotice", () => {
  it("renders nothing when not applicable (manual entry / manual fallback)", () => {
    const { container } = render(
      <ReconciliationNotice
        reconciliation={makeResult({ applicable: false, extractedTotal: undefined })}
        dismissed={false}
        onContinueAnyway={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when applicable and reconciled", () => {
    const { container } = render(
      <ReconciliationNotice
        reconciliation={makeResult({ applicable: true, reconciled: true })}
        dismissed={false}
        onContinueAnyway={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when dismissed, even if mismatched", () => {
    const { container } = render(
      <ReconciliationNotice
        reconciliation={makeResult({ applicable: true, reconciled: false, difference: -210 })}
        dismissed={true}
        onContinueAnyway={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows both computed and extracted totals when mismatched", () => {
    render(
      <ReconciliationNotice
        reconciliation={makeResult({
          applicable: true,
          reconciled: false,
          computedTotal: 990,
          extractedTotal: 1200,
          difference: -210,
        })}
        dismissed={false}
        onContinueAnyway={vi.fn()}
      />,
    );
    expect(screen.getByText(/don.t add up/i)).toBeInTheDocument();
    // formatCurrency output for both figures should be present somewhere in the notice.
    expect(screen.getByText(/990/)).toBeInTheDocument();
    expect(screen.getByText(/1,200|1200/)).toBeInTheDocument();
  });

  it("calls onContinueAnyway when the button is pressed", () => {
    const onContinueAnyway = vi.fn();
    render(
      <ReconciliationNotice
        reconciliation={makeResult({ applicable: true, reconciled: false, difference: -210 })}
        dismissed={false}
        onContinueAnyway={onContinueAnyway}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));
    expect(onContinueAnyway).toHaveBeenCalledTimes(1);
  });
});
