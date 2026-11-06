import { HealthRepository } from "@/repositories/health.repository";

export const HealthService = {
  /**
   * Memastikan server dan basis data hidup
   * Query sederhana ke database; bila database mati, galat dilempar dan endpoint menjawab 500, sehingga pemantau tahu ada masalah.
   */
  async cek() {
    await HealthRepository.ping();
    return { status: "ok" };
  },
};
