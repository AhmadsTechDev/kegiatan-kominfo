// =============================================================================
// KOMPONEN INDIKATOR PUTAR (SPINNER)
// =============================================================================
// Gunanya: Komponen UI dasar dari shadcn/ui berupa ikon berputar untuk menandai
//          indikasi pemuatan atau proses yang sedang berjalan pada antarmuka.
// =============================================================================

import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
