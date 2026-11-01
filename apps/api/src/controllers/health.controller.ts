import { HealthService } from "@/services/health.service";

export const HealthController = {
  // GET /api/health
  cek: () => HealthService.cek(),
};
