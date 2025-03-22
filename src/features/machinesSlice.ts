import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MachinesState {
  machineCount: Record<string, number>;
  machineMultiplier: Record<string, number>;
}

const initialState: MachinesState = {
  machineCount: {},
  machineMultiplier: {}
};

const machinesSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {
    setMachineCount: (state, action: PayloadAction<{ nodeId: string; count: number }>) => {
      state.machineCount[action.payload.nodeId] = action.payload.count;
    },
    setMachineMultiplier: (state, action: PayloadAction<{ nodeId: string; multiplier: number }>) => {
      state.machineMultiplier[action.payload.nodeId] = action.payload.multiplier;
    },
    clearMachines: (state) => {
      state.machineCount = {};
      state.machineMultiplier = {};
    },
    loadMachines: (state, action: PayloadAction<MachinesState>) => {
      state.machineCount = action.payload.machineCount;
      state.machineMultiplier = action.payload.machineMultiplier;
    }
  }
});

export const { 
  setMachineCount,
  setMachineMultiplier,
  clearMachines,
  loadMachines
} = machinesSlice.actions;
export default machinesSlice.reducer; 