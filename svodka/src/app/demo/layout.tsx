import Link from "next/link";
import { DemoSidebar } from "./demo-sidebar";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DemoSidebar />
      <main className="flex-1 overflow-auto">
        {/* Demo banner */}
        <div className="border-b bg-amber-50 px-6 py-2.5 text-center text-sm dark:bg-amber-950/30">
          <span className="text-amber-800 dark:text-amber-200">
            Это демо-версия с примерными данными.{" "}
            <Link
              href="/login"
              className="font-medium underline underline-offset-4 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Подключить свои данные &rarr;
            </Link>
          </span>
        </div>
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
