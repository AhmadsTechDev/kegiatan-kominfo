"use client";

import { useSyncExternalStore } from "react";

/**
 * Sapaan pagi/siang/sore/malam menurut jam WIB tanpa galat hidrasi
 */

const subscribe = () => () => {};

function sapaanSekarang() {
  const jam = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

export function useSapaan() {
  return useSyncExternalStore(subscribe, sapaanSekarang, () => "Selamat datang");
}
