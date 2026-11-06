"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/**
 * Dialog pembungkus formulir singkat (master data, akun, kata sandi)
 */

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  galat?: string | null;
  children: React.ReactNode;
};

export function FormDialog({ open, onOpenChange, title, description, onSubmit, pending, submitLabel, galat, children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent
        className="sm:max-w-lg"

        /**
         * Tanpa autofocus ke kolom pertama: di HP keyboard tidak langsung muncul menutupi dialog.
         * Fokus tetap dipindah ke dialog agar pembaca layar dan Tab mulai dari dalam dialog
         */
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
      >
        <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-4">{children}</div>
          {galat && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {galat}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => onOpenChange(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" className="h-10 pointer-coarse:min-h-11" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Menyimpan..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

