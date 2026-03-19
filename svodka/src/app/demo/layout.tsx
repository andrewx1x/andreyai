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
      <main className="flex-1 overflow-auto pb-12">
        {/* Demo banner */}
        <div className="sticky top-0 z-10 border-b border-indigo-100 bg-indigo-50/90 px-6 py-2.5 text-center text-[13px] backdrop-blur-sm">
          <span className="text-indigo-700">
            Демо-версия с примерными данными.{" "}
            <Link
              href="/login"
              className="font-semibold underline decoration-indigo-300 underline-offset-4 transition-colors hover:text-indigo-900"
            >
              Подключить свои данные &rarr;
            </Link>
          </span>
        </div>
        <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
