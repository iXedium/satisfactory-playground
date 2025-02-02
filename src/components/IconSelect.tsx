import React, { useState, useRef, useEffect } from "react";
import { Item } from "../data/dexieDB";
import { iconStyles } from "../styles/iconStyles";
import ItemWithIcon from "./ItemWithIcon";

interface IconSelectProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const IconSelect: React.FC<IconSelectProps> = ({ 
  items, 
  value, 
  onChange, 
  placeholder = "Select an Item" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = items.find(item => item.id === value);

  return (
    <div ref={containerRef} style={iconStyles.selectContainer}>
      {/* Selected Item Display */}
      <div
        style={iconStyles.customSelect}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value && selectedItem ? (
          <ItemWithIcon itemId={selectedItem.id} />
        ) : (
          placeholder
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={iconStyles.dropdown}>
          {items.map((item) => (
            <div
              key={item.id}
              style={iconStyles.dropdownItem}
              onClick={() => {
                onChange(item.id);
                setIsOpen(false);
              }}
            >
              <ItemWithIcon itemId={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconSelect;
