import { HealthRepository } from "@/repositories/health.repository";

export const HealthService = {
  // Memastikan server dan basis data hidup
  async cek() {
    await HealthRepository.ping();
    return { status: "ok" };
  },
};
