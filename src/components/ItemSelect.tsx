import React, { useEffect } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { Item } from "../data/dexieDB";
import Icon from "./Icon"; // using the Icon component
import { itemSelectStyles } from "../styles/itemSelectStyles"; // new import

interface ItemSelectProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Using MUI's createFilterOptions with fuzzy search.
const filterOptions = createFilterOptions({
  matchFrom: "any",
  stringify: (option: Item) => option.name,
});

const ItemSelect: React.FC<ItemSelectProps> = ({
  items,
  value,
  onChange,
  placeholder = "Select an Item"
}) => {
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
  if (items.length === 0) return null;

  return (
    <Autocomplete
      // disable clearability
      disableClearable
      options={items}
      value={selectedOption || undefined}
      inputValue={inputValue}
      filterOptions={filterOptions}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      onChange={(event, newValue) => {
        onChange(newValue ? newValue.id : "");
        setInputValue(""); // Clear text on selection
      }}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}>
            <Icon itemId={option.id} size="small" showWrapper={false} style={{ marginRight: "8px" }} />
            {option.name}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: selectedOption ? (
              <InputAdornment position="start">
                <Icon itemId={selectedOption.id} size="small" showWrapper={false} />
              </InputAdornment>
            ) : null,
          }}
          sx={itemSelectStyles.autocompleteInput} // using the new style property from itemSelectStyles
        />
      )}
      style={itemSelectStyles.autocomplete}
      componentsProps={{
        paper: {
          style: itemSelectStyles.autocompletePaper,
        },
      }}
      sx={{
        '& .MuiAutocomplete-listbox': itemSelectStyles.autocompleteListbox,
      }}
    />
  );
};

export default ItemSelect;
