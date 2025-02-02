import React from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { Item } from "../data/dexieDB";
import Icon from "./Icon"; // using the Icon component

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
  const selectedOption = items.find(item => item.id === value) || null;
  const [inputValue, setInputValue] = React.useState("");

  return (
    <Autocomplete
      options={items}
      value={selectedOption}
      inputValue={inputValue}
      filterOptions={filterOptions}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      onChange={(event, newValue) => {
        onChange(newValue ? newValue.id : "");
        setInputValue(""); // Clear text on selection
      }}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props}>
          <Icon itemId={option.id} size="small" showWrapper={false} style={{ marginRight: "8px" }} />
          {option.name}
        </li>
      )}
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
        />
      )}
      style={{ width: "100%" }}
    />
  );
};

export default ItemSelect;
