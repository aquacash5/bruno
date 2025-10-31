const { app } = require('electron');

class SystemMonitor {
  constructor() {
    this.timeoutId = null;
    this.startTime = null;
  }

  start(win, intervalMs = 2000) {
    if (this.isRunning()) {
      return;
    }

    // Emit initial stats
    this.emitSystemStats(win);

    // Set up periodic monitoring
    // Use setTimeout pattern instead of setInterval to avoid overlapping calls
    this.scheduleNextEmit(win, intervalMs, true);
  }

  scheduleNextEmit(win, intervalMs, start = false) {
    if (!start && !this.isRunning()) {
      return;
    }

    this.timeoutId = setTimeout(() => {
      this.emitSystemStats(win);
      this.scheduleNextEmit(win, intervalMs);
    }, intervalMs);
  }

  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  emitSystemStats(win) {
    let systemResources;

    try {
      systemResources = this.getAppMetrics();
    } catch (error) {
      console.error('Error getting system stats:', error);

      // Fallback stats using process.memoryUsage()
      systemResources = this.getProcessMemory();
    } finally {
      if (win && !win.isDestroyed()) {
        win.webContents.send('main:filesync-system-resources', systemResources);
      }
    }
  }

  getAppMetrics() {
    const metrics = app.getAppMetrics();
    const currentTime = new Date();

    if (this.startTime == null) {
      let creationTime = metrics[0].creationTime;

      for (const metric of metrics) {
        creationTime = Math.min(creationTime, metric.creationTime);
      }

      this.startTime = new Date(creationTime);
    }

    let totalCPU = 0;
    let totalMemory = 0;

    for (const metric of metrics) {
      totalCPU += metric.cpu.percentCPUUsage;
      totalMemory += metric.memory.workingSetSize;
    }

    const uptime = (currentTime - this.startTime) / 1000;

    return {
      cpu: totalCPU,
      memory: totalMemory,
      pid: process.pid,
      uptime: uptime,
      timestamp: currentTime.toISOString()
    };
  }

  getProcessMemory() {
    const memory = process.memoryUsage();
    const currentTime = new Date();
    const uptime = !this.startTime ? 0 : (currentTime - this.startTime) / 1000;

    return {
      cpu: 0,
      memory: memory.rss,
      pid: process.pid,
      uptime: uptime,
      timestamp: currentTime.toISOString()
    };
  }

  isRunning() {
    return this.timeoutId != null;
  }
}

module.exports = SystemMonitor;
