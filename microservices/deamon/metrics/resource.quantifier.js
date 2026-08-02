class ResourceMetrics {
  constructor(systemCpuCapacityMs, systemRamCapacityMb) {
    this.systemCpuCapacityMs = systemCpuCapacityMs;
    this.systemRamCapacityMb = systemRamCapacityMb;
  }
  // Resource Cost Index (weighted sum)
  /**
   * Resource Cost Index (RCI)
   *
   * Formula: (alpha * usedCpuMs) + (beta * usedRamMb)
   *
   * - alpha → weight for CPU usage (how important CPU time is in your system)
   * - beta  → weight for RAM usage (how important memory footprint is in your system)
   *
   * Example:
   *   If CPU is the main bottleneck, set alpha higher (e.g., 0.8) and beta lower (0.2).
   *   If RAM is more critical, set beta higher (e.g., 0.7) and alpha lower (0.3).
   *   If both matter equally, keep them balanced (e.g., 0.5 and 0.5).
   *
   * This makes the RCI flexible: you can rebalance priorities if system hardware changes.
  */
  calculateRCI(usedCpuMs, usedRamMb, alpha = 1, beta = 1) {
    return (alpha * usedCpuMs) + (beta * usedRamMb);
  }
  // Normalized Resource Units (scaled to system capacity)
  calculateNRU(usedCpuMs, usedRamMb) {
    const cpuNorm = usedCpuMs / this.systemCpuCapacityMs;
    const ramNorm = usedRamMb / this.systemRamCapacityMb;
    return (cpuNorm + ramNorm) / 2; // average normalized score
  }

  // Job Complexity Score (emphasizes heavy jobs)
  calculateComplexity(usedCpuMs, usedRamMb) {
    return Math.sqrt(usedCpuMs * usedRamMb);
  }
}
