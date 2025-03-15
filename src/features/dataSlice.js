import { createSlice } from "@reduxjs/toolkit";
import { loadData } from "../data/dataLoader";
const initialState = loadData();
const dataSlice = createSlice({
    name: "data",
    initialState,
    reducers: {},
});
export default dataSlice.reducer;
