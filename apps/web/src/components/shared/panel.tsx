import { cn } from "@/lib/utils";

// Pembungkus konten bergaya kartu: kepala, badan, dan kaki

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm", className)} {...props} />;
}

type PanelHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
};

export function PanelHeader({ title, description, action, className, as: Judul = "h2" }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-4 pb-3 md:px-5 md:pt-5", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <Judul className="font-heading text-base font-bold">{title}</Judul>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pb-4 md:px-5 md:pb-5", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-muted px-4 py-3 text-xs text-muted-foreground md:px-5", className)}
      {...props}
    />
  );
}