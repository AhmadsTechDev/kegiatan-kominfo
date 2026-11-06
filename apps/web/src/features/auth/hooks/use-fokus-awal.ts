"use client";

import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetFocus } from "react-hook-form";

/**
 * Fokus otomatis ke kolom pertama hanya di perangkat bermouse
 */

/**
 * Di HP, fokus otomatis langsung memunculkan keyboard dan menutupi layar; karena itu hanya dilakukan di perangkat bermouse (pointer: fine).
 */
export function useFokusAwal<T extends FieldValues>(setFocus: UseFormSetFocus<T>, nama: Path<T>) {
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setFocus(nama);
  }, [setFocus, nama]);
}
