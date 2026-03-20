import type { BusinessStatus, Problem, Action } from "@/lib/engine/types";

const statusColors: Record<BusinessStatus, string> = {
  healthy: "#059669",
  attention: "#d97706",
  critical: "#e11d48",
};

const statusLabels: Record<BusinessStatus, string> = {
  healthy: "Всё в порядке",
  attention: "Требует внимания",
  critical: "Есть проблемы",
};

const priorityEmoji: Record<string, string> = {
  critical: "\u{1F534}",
  high: "\u{1F7E1}",
  medium: "\u{1F535}",
  low: "\u{26AA}",
};

export function buildAlertSubject(problems: Problem[]): string {
  const critical = problems.filter((p) => p.priority === "critical");
  if (critical.length === 1) {
    return `Сводка: ${critical[0].title}`;
  }
  return `Сводка: ${problems.length} проблем${problems.length === 1 ? "а" : ""} требу${problems.length === 1 ? "ет" : "ют"} внимания`;
}

export function buildAlertEmailHtml(
  userName: string,
  status: BusinessStatus,
  problems: Problem[],
  actions: Action[],
  appUrl: string
): string {
  const color = statusColors[status];
  const label = statusLabels[status];

  const problemBlocks = problems
    .slice(0, 3)
    .map((p) => {
      const action = actions.find((a) => a.problemId === p.id);
      return `
        <div style="margin-bottom:16px;padding:12px 16px;border-left:4px solid ${color};background:#f9fafb;border-radius:0 8px 8px 0;">
          <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:4px;">
            ${priorityEmoji[p.priority] || ""} ${p.title}
          </div>
          <div style="font-size:14px;color:#6b7280;margin-bottom:4px;">${p.cause}</div>
          ${action ? `<div style="font-size:14px;color:#4f46e5;font-weight:500;">&rarr; ${action.title}</div>` : ""}
        </div>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;">Сводка — ${label}</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">
        ${userName ? `${userName}, у` : "У"} вас ${problems.length} проблем${problems.length === 1 ? "а" : ""}, на которые стоит обратить внимание:
      </p>
      ${problemBlocks}
      <div style="margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
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
