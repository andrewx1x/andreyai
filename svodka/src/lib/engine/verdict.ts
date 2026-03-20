// KPI verdict — visual indicator of metric health

export type Verdict = "ok" | "warning" | "danger";

interface VerdictThresholds {
  warning: number;
  danger: number;
}

const DEFAULT_THRESHOLDS: VerdictThresholds = { warning: 5, danger: 20 };

export function getVerdict(
  changePercent: number,
  invertColors: boolean,
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS
): Verdict {
  const abs = Math.abs(changePercent);
  const isBadDirection = invertColors ? changePercent > 0 : changePercent < 0;

  if (!isBadDirection || abs < thresholds.warning) return "ok";
  if (abs >= thresholds.danger) return "danger";
  return "warning";
}
