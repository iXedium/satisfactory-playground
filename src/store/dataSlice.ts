import { createSlice } from "@reduxjs/toolkit";
import { loadData, DataStructure } from "../data/dataLoader";

const initialState: DataStructure = loadData();

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {},
});

export default dataSlice.reducer;
