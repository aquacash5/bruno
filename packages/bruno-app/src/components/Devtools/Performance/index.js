import React, { useEffect, useRef, forwardRef } from 'react';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import { IconCpu, IconDatabase, IconClock, IconServer, IconChartLine, IconCaretDown } from '@tabler/icons';

export const PERFORMANCE_POLLING_RATES = [
  {
    label: 'Fast',
    rate: 250
  }, {
    label: 'Medium',
    rate: 1000
  }, {
    label: 'Slow',
    rate: 2000
  }, {
    label: 'Pause',
    rate: Math.pow(2, 31) - 1
  }
];

const currentPollingRate = (pollingRate) => {
  const currentRate = PERFORMANCE_POLLING_RATES.find(({ rate }) => rate === pollingRate);

  if (currentRate == null) {
    return {
      label: `Custom ${pollingRate}`,
      rate: pollingRate
    };
  } else {
    return currentRate;
  }
};

const Performance = () => {
  const { systemResources, pollingRateMs } = useSelector((state) => state.performance);
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const { ipcRenderer } = window;
  const { theme } = useTheme();

  const currentRate = currentPollingRate(pollingRateMs);

  useEffect(() => {
    if (!ipcRenderer) {
      console.warn('IPC Renderer not available');
      return;
    }

    const startMonitoring = async () => {
      try {
        await ipcRenderer.invoke('renderer:start-system-monitoring');
      } catch (error) {
        console.error('Failed to start system monitoring:', error);
      }
    };

    const stopMonitoring = async () => {
      try {
        await ipcRenderer.invoke('renderer:stop-system-monitoring');
      } catch (error) {
        console.error('Failed to stop system monitoring:', error);
      }
    };

    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [ipcRenderer]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const DropDownIcon = forwardRef((props, ref) => {
    return (
      <button
        ref={ref}
        className="px-2 py-1 text-xs rounded-sm outline-none transition-colors duration-100 w-24 bg flex items-center justify-between"
        style={{
          backgroundColor: theme.modal.input.bg,
          border: `1px solid ${theme.modal.input.border}`,
          color: theme.modal.input.text
        }}
      >
        <span>{props.rate}</span> <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </button>
    );
  });

  const SystemResourceCard = ({ icon: Icon, title, value, subtitle, color = 'default', trend }) => (
    <div className={`resource-card ${color}`}>
      <div className="resource-header">
        <Icon size={20} strokeWidth={1.5} />
        <span className="resource-title">{title}</span>
      </div>
      <div className="resource-value">{value}</div>
      {subtitle && <div className="resource-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`resource-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'}`}>
          <IconChartLine size={12} strokeWidth={1.5} />
          <span>
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}
            %
          </span>
        </div>
      )}
    </div>
  );

  return (
    <StyledWrapper>
      <div className="tab-content">
        <div className="tab-content-area">
          <div className="title-area">
            <div className="system-resources">
              <h2>System Resources</h2>
              <Dropdown
                onCreate={onDropdownCreate}
                icon={<DropDownIcon rate={currentRate.label} />}
                placement="bottom-start"
              >
                {PERFORMANCE_POLLING_RATES.map(({ label, rate }) => (
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      dropdownTippyRef.current.hide();
                      ipcRenderer.invoke('renderer:polling-rate-system-monitoring', rate);
                    }}
                  >
                    {label}
                  </div>
                ))}
              </Dropdown>
            </div>
            <div className="resource-cards">
              <SystemResourceCard
                icon={IconCpu}
                title="CPU Usage"
                value={`${systemResources.cpu.toFixed(1)}%`}
                subtitle="Current process"
                color={systemResources.cpu > 80 ? 'danger' : systemResources.cpu > 60 ? 'warning' : 'success'}
              />

              <SystemResourceCard
                icon={IconDatabase}
                title="Memory Usage"
                value={formatBytes(systemResources.memory)}
                subtitle="Current process"
                color={systemResources.memory > 500 * 1024 * 1024 ? 'danger' : 'default'}
              />

              <SystemResourceCard
                icon={IconClock}
                title="Uptime"
                value={formatUptime(systemResources.uptime)}
                subtitle="Process runtime"
                color="info"
              />

              <SystemResourceCard
                icon={IconServer}
                title="Process ID"
                value={systemResources.pid || 'N/A'}
                subtitle="Current PID"
                color="default"
              />
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Performance;
