import { jsx as _jsx } from "react/jsx-runtime";
import { theme } from '../../styles/theme';
const StyledSwitch = ({ checked, onChange, style }) => {
    return (_jsx("div", { onClick: () => onChange(!checked), style: {
            width: '48px',
            height: '24px',
            backgroundColor: checked ? theme.colors.buttonDefault : theme.colors.dark,
            border: `2px solid ${theme.colors.dropdown.border}`,
            borderRadius: '12px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            ...style
        }, children: _jsx("div", { style: {
                width: '16px',
                height: '16px',
                backgroundColor: theme.colors.text,
                borderRadius: '2px',
                position: 'absolute',
                top: '2px',
                left: checked ? '26px' : '2px',
                transition: 'all 0.2s ease-in-out'
            } }) }));
};
export default StyledSwitch;
