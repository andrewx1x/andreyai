import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PaywallOverlayProps {
  planName: string;
  price: string;
}

export function PaywallOverlay({ planName, price }: PaywallOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-sm rounded-xl border bg-card p-8 text-center shadow-lg">
        <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          Доступно на тарифе {planName}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Подключите за {price} руб./мес или выберите тариф «Всё» за 1 490 руб./мес
        </p>
        <Link href="/settings/subscription" className={buttonVariants({ className: "mt-4 w-full" })}>
          Выбрать тариф
        </Link>
      </div>
    </div>
  );
}
