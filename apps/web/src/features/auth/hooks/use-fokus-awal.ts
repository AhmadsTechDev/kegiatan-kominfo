"use client";

import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetFocus } from "react-hook-form";

export function useFokusAwal<T extends FieldValues>(setFocus: UseFormSetFocus<T>, nama: Path<T>) {
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setFocus(nama);
  }, [setFocus, nama]);
}
