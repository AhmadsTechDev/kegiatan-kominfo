import { prisma } from "@/lib/prisma";

export const HealthRepository = {
  /**
   * Kueri paling ringan untuk memastikan basis data bisa dihubungi
   */
  async ping() {
    await prisma.$queryRaw`SELECT 1`;
  },
};
