"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Mutasi unggah dan hapus foto profil

export function useUnggahFoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (berkas: File) => {
      const form = new FormData();
      form.append("berkas", berkas);
      return (await apiClient.post<{ foto: string | null }>("/me/foto", form)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useHapusFoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.delete<{ foto: null }>("/me/foto")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

