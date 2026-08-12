import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "./dataSlice";
import workspaceReducer from "./workspaceSlice";

export const store = configureStore({
  reducer: {
    data: dataReducer,
    workspace: workspaceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
