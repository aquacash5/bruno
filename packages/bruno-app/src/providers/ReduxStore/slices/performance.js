import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  systemResources: {
    cpu: 0,
    memory: 0,
    pid: null,
    uptime: 0,
    lastUpdated: null
  },
  pollingRateMs: 2000
};

export const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    updateSystemResources: (state, action) => {
      state.systemResources = {
        ...state.systemResources,
        ...action.payload,
        lastUpdated: new Date().toISOString()
      };
    },
    updatePollingRateMs: (state, action) => {
      state.pollingRateMs = action.payload;
    }
  }
});

export const { updateSystemResources, updatePollingRateMs } = performanceSlice.actions;
export default performanceSlice.reducer;
