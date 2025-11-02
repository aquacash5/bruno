const { app } = require('electron');
const EventEmitter = require('node:events');

class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.timeoutId = null;
    this.startTime = null;
    this.pollIntervalMs = 2000;

    this.on('removeListener', (event) => {
      if (event === 'statistics' && !this.eventNames().includes('statistics')) {
        this.__stop();
      }
    });
    this.on('newListener', (event) => {
      if (event === 'statistics') {
        this.__start();
      }
    });
  }

  __start() {
    if (this.isRunning()) {
      return;
    }

    this.emit('started', this.pollIntervalMs);

    // Set up periodic monitoring
    this.__emitSystemStats(true);
  }

  __stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.emit('stopped');
    }
  }

  // Use setTimeout pattern instead of setInterval to avoid overlapping calls
  __emitSystemStats(start = false) {
    try {
      this.emit('statistics', this.__getAppMetrics());
    } catch (error) {
      this.emit('error', error);

      // Fallback stats using process.memoryUsage()
      this.emit('statistics', this.__getProcessMemory());
    } finally {
      if (start || this.isRunning()) {
        this.timeoutId = setTimeout(() => this.__emitSystemStats(), this.pollIntervalMs);
      }
    }
  }

  __getAppMetrics() {
    const metrics = app.getAppMetrics();
    const currentTime = new Date();

    if (metrics.length === 0) {
      throw new Error('No metrics returned');
    }

    // this will only happen once
    if (this.startTime == null) {
      let creationTime = metrics[0].creationTime;

      for (const metric of metrics) {
        creationTime = Math.min(metric.creationTime, creationTime);
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

  __getProcessMemory() {
    const memoryUsage = process.memoryUsage();
    const currentTime = new Date();
    const uptime = !this.startTime ? 0 : (currentTime - this.startTime) / 1000;

    return {
      cpu: 0,
      memory: memoryUsage.rss,
      pid: process.pid,
      uptime: uptime,
      timestamp: currentTime.toISOString()
    };
  }

  setPollingInterval(pollingRateMs) {
    this.emit('changePollingRate', pollingRateMs);
    this.pollIntervalMs = pollingRateMs;

    if (this.isRunning()) {
      clearTimeout(this.timeoutId);

      // Set up periodic monitor with new polling rate
      this.__emitSystemStats();
    }
  }

  isRunning() {
    return this.timeoutId != null;
  }
}

module.exports = SystemMonitor;
