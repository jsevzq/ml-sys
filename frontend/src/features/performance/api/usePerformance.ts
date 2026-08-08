import { usePerformanceControllerReport } from '@/api/generated/performance/performance';

/** Rentabilidad real: el neto de ML menos lo que costó la mercadería. */
export const usePerformance = () => usePerformanceControllerReport();
