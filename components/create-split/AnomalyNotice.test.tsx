import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalyNotice } from "./AnomalyNotice";
import type { AnomalyFlag } from "@/lib/domain/anomaly-detection";

describe("AnomalyNotice", () => {
  it("renders nothing when there are no flags", () => {
    const { container } = render(
      <AnomalyNotice flags={[]} dismissed={false} onContinueAnyway={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when dismissed, even with flags present", () => {
    const flags: AnomalyFlag[] = [{ code: "unusual_precision", message: "Some amounts look off." }];
    const { container } = render(
      <AnomalyNotice flags={flags} dismissed={true} onContinueAnyway={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every flag's message", () => {
    const flags: AnomalyFlag[] = [
      { code: "unusual_precision", message: "Some amounts have unusual precision." },
      { code: "suspiciously_low_total", message: "The total looks unusually low." },
    ];
    render(<AnomalyNotice flags={flags} dismissed={false} onContinueAnyway={vi.fn()} />);
    expect(screen.getByText(/unusual precision/i)).toBeInTheDocument();
    expect(screen.getByText(/unusually low/i)).toBeInTheDocument();
  });

  it("calls onContinueAnyway when pressed", () => {
    const onContinueAnyway = vi.fn();
    const flags: AnomalyFlag[] = [{ code: "non_positive_total", message: "The total is zero." }];
    render(<AnomalyNotice flags={flags} dismissed={false} onContinueAnyway={onContinueAnyway} />);
    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));
    expect(onContinueAnyway).toHaveBeenCalledTimes(1);
  });
});
