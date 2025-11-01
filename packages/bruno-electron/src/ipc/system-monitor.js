const { ipcMain } = require('electron');

const registerSystemMonitorIpc = (mainWindow, systemMonitor) => {
  const sendStatistics = (stats) => {
    mainWindow.webContents.send('main:filesync-system-resources', stats);
  };

  systemMonitor.on('error', (err) => console.error('Error getting system stats:', err));
  systemMonitor.on('changePollingRate', (pollingRate) => mainWindow.webContents.send('main:filesync-system-monitor-polling', pollingRate));

  ipcMain.handle('renderer:start-system-monitoring', (event) => {
    try {
      systemMonitor.on('statistics', sendStatistics);
      return { success: true };
    } catch (error) {
      console.error('Error starting system monitoring:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:stop-system-monitoring', (event) => {
    try {
      systemMonitor.off('statistics', sendStatistics);
      return { success: true };
    } catch (error) {
      console.error('Error stopping system monitoring:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:polling-rate-system-monitoring', (event, intervalMs = 2000) => {
    try {
      systemMonitor.setPollingInterval(intervalMs);
      return { success: true };
    } catch (error) {
      console.error('Error setting the polling interval:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:is-system-monitoring-active', (event) => {
    try {
      const isActive = systemMonitor.isRunning();
      return { success: true, isActive };
    } catch (error) {
      console.error('Error checking system monitoring status:', error);
      return { success: false, error: error.message, isActive: false };
    }
  });

  return () => systemMonitor.off('statistics', sendStatistics);
};

module.exports = registerSystemMonitorIpc;
