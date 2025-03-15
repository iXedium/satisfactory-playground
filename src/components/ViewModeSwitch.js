import { jsx as _jsx } from "react/jsx-runtime";
import { Switch, styled } from "@mui/material";
import { theme } from "../styles/theme";
const OrangeSwitch = styled(Switch)({
    '& .MuiSwitch-switchBase.Mui-checked': {
        color: theme.colors.primary,
        '&:hover': {
            backgroundColor: theme.colors.hover,
        },
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
        backgroundColor: theme.colors.primary,
    },
    '& .MuiSwitch-track': {
        backgroundColor: theme.colors.iconBg,
    },
});
const ViewModeSwitch = ({ mode, onToggle }) => {
    return (_jsx(OrangeSwitch, { checked: mode === "tree", onChange: (e) => onToggle(e.target.checked ? "tree" : "list"), size: "small" }));
};
export default ViewModeSwitch;
