import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Сводка</h1>
          <p className="text-muted-foreground">
            Контроль рекламы и сайта без входа в Яндекс
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("yandex", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FC3F1D] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#E53510]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M13.32 7.67h-.67c-1.37 0-2.09.6-2.09 1.64 0 1.17.55 1.8 1.67 2.58l.93.64-2.72 4.47H8.5l2.43-3.97c-1.45-1.04-2.25-2.07-2.25-3.72 0-2.07 1.47-3.45 4.02-3.45h2.3v11.14h-1.68V7.67z"
                fill="currentColor"
              />
            </svg>
            Войти через Яндекс
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Одним действием вы авторизуетесь и подключаете доступ к Метрике и Директу
        </p>
      </div>
    </div>
  );
}
