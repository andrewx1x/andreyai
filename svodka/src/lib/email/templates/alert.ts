import type { Signal } from "@/lib/engine/types";

export function buildAlertEmailHtml(
  projectName: string,
  signals: Signal[],
  appUrl: string
): string {
  const signalRows = signals
    .map((s) => {
      const color = s.severity === "critical" ? "#ef4444" : s.severity === "warning" ? "#f59e0b" : "#3b82f6";
      const arrow = s.changePercent > 0 ? "↑" : "↓";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">
            <span style="color:${color};font-weight:600;">${s.severity === "critical" ? "🔴" : "🟡"}</span>
            ${s.metricLabel}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">
            ${arrow} ${Math.abs(s.changePercent).toFixed(1)}%
          </td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#18181b;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;">Сводка — Алерт</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#374151;">
        Обнаружены отклонения в проекте <strong>${projectName}</strong>:
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${signalRows}
      </table>
      <div style="margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
          Открыть Сводку
        </a>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #eee;color:#9ca3af;font-size:12px;">
      Вы получили это письмо потому что включены алерты. Отключить можно в настройках.
    </div>
  </div>
</body>
</html>`;
}
