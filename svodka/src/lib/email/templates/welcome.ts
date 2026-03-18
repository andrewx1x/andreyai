export function buildWelcomeEmailHtml(userName: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#18181b;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;">Добро пожаловать в Сводку!</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;color:#374151;">
        Привет${userName ? `, ${userName}` : ""}! Ваш аккаунт создан.
      </p>
      <p style="margin:0 0 16px;color:#374151;">
        Сводка — это центр контроля сайта и рекламы. Подключите счётчик Яндекс.Метрики или аккаунт Директа, чтобы начать получать аналитику и алерты.
      </p>
      <div style="margin-top:24px;">
        <a href="${appUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
          Открыть Сводку
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
