import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Icon from "./Icon"; // using the Icon component
import { itemSelectStyles } from "../styles/itemSelectStyles"; // new import
// Using MUI's createFilterOptions with fuzzy search.
const filterOptions = createFilterOptions({
    matchFrom: "any",
    stringify: (option) => option.name,
});
const ItemSelect = ({ items, value, onChange, placeholder = "Select an Item" }) => {
    // Add effect to set default selection when items load
    useEffect(() => {
        if (!value && items.length > 0) {
            onChange(items[0].id);
        }
    }, [items, value, onChange]);
    // Always derive a selected option, falling back to the first item.
    const selectedOption = items.find(item => item.id === value) || (items.length > 0 ? items[0] : undefined);
    const [inputValue, setInputValue] = React.useState("");
    // Render nothing until items are loaded.
    if (items.length === 0)
        return null;
    return (_jsx(Autocomplete
    // disable clearability
    , { 
        // disable clearability
        disableClearable: true, options: items, value: selectedOption || undefined, inputValue: inputValue, filterOptions: filterOptions, onInputChange: (event, newInputValue) => setInputValue(newInputValue), onChange: (event, newValue) => {
            onChange(newValue ? newValue.id : "");
            setInputValue(""); // Clear text on selection
        }, getOptionLabel: (option) => option.name, renderOption: (props, option) => {
            const { key, ...rest } = props;
            return (_jsxs("li", { ...rest, children: [_jsx(Icon, { itemId: option.id, size: "small", showWrapper: false, style: { marginRight: "8px" } }), option.name] }, key));
        }, renderInput: (params) => (_jsx(TextField, { ...params, variant: "outlined", placeholder: placeholder, InputProps: {
                ...params.InputProps,
                startAdornment: selectedOption ? (_jsx(InputAdornment, { position: "start", children: _jsx(Icon, { itemId: selectedOption.id, size: "small", showWrapper: false }) })) : null,
            }, sx: itemSelectStyles.autocompleteInput })), style: itemSelectStyles.autocomplete, componentsProps: {
            paper: {
                style: itemSelectStyles.autocompletePaper,
            },
        }, sx: {
            '& .MuiAutocomplete-listbox': itemSelectStyles.autocompleteListbox,
        } }));
};
export default ItemSelect;
