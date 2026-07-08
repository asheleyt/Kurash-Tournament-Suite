import { type ProcessHandle, isProcessRunning, killProcess } from './launcher.js';

export interface ManagedProcess {
  handle: ProcessHandle;
  isHealthy: boolean;
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private cleanupTimeout = 15000;

  /**
   * Register a process for management
   */
  register(handle: ProcessHandle): void {
    const managed: ManagedProcess = {
      handle,
      isHealthy: true,
    };

    this.processes.set(handle.name, managed);
    console.log(`[ProcessManager] Registered ${handle.name} (PID: ${handle.pid})`);
  }

  /**
   * Unregister a process
   */
  unregister(name: string): void {
    this.processes.delete(name);
  }

  /**
   * Check if a process is running
   */
  isRunning(name: string): boolean {
    const managed = this.processes.get(name);
    if (!managed || !managed.handle.pid) return false;

    return isProcessRunning(managed.handle.pid);
  }

  /**
   * Get PID of a managed process
   */
  getPid(name: string): number | undefined {
    return this.processes.get(name)?.handle.pid;
  }

  /**
   * Get all registered process names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Gracefully close a process
   */
  async gracefulClose(name: string, timeout = this.cleanupTimeout): Promise<boolean> {
    const managed = this.processes.get(name);
    if (!managed || !managed.handle.pid) return false;

    if (!this.isRunning(name)) {
      this.unregister(name);
      return true;
    }

    // Use killProcess from launcher (taskkill /F /T on Windows)
    killProcess(managed.handle);
    console.log(`[ProcessManager] ${name} killed`);
    this.unregister(name);
    return true;
  }

  /**
   * Force kill a process
   */
  forceKill(name: string): void {
    const managed = this.processes.get(name);
    if (!managed || !managed.handle.pid) return;

    killProcess(managed.handle);
    console.log(`[ProcessManager] ${name} force killed`);
    this.unregister(name);
  }

  /**
   * Cleanup all processes
   */
  async cleanupAll(timeout = this.cleanupTimeout): Promise<void> {
    const names = Array.from(this.processes.keys());
    console.log(`[ProcessManager] Cleaning up ${names.length} processes...`);

    // Try graceful close first
    const gracefulPromises = names.map((name) => this.gracefulClose(name, timeout));
    await Promise.allSettled(gracefulPromises);

    // Force kill any remaining
    const remaining = Array.from(this.processes.keys());
    for (const name of remaining) {
      this.forceKill(name);
    }

    console.log('[ProcessManager] All processes cleaned up');
  }

  /**
   * Get health status of all processes
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, managed] of this.processes) {
      status[name] = this.isRunning(name);
    }
    return status;
  }
}

// Singleton instance
let managerInstance: ProcessManager | null = null;

export function getProcessManager(): ProcessManager {
  if (!managerInstance) {
    managerInstance = new ProcessManager();
  }
  return managerInstance;
}
