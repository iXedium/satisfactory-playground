import { configureStore } from "@reduxjs/toolkit";
import dataReducer from "../features/dataSlice";
import dependencyReducer from "../features/dependencySlice"; // ✅ Import new slice
import recipeSelectionsReducer from '../features/recipeSelectionsSlice';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    dependencies: dependencyReducer, // ✅ Add dependencies slice
    recipeSelections: recipeSelectionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
