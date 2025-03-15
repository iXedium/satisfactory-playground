import { theme } from "./theme";
export const viewModeSwitchStyles = {
    container: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.gap,
    },
    label: {
        color: theme.switch.label,
        fontSize: "14px",
        cursor: "pointer",
    },
    switchContainer: {
        position: "relative",
        width: "60px",
        height: "30px",
        backgroundColor: theme.switch.track,
        borderRadius: "15px",
        cursor: "pointer",
    },
    knob: {
        position: "absolute",
        top: "2px",
        left: "2px",
        width: "26px",
        height: "26px",
        backgroundColor: theme.switch.knob,
        borderRadius: "50%",
        transition: "left 0.2s",
    },
    knobActive: {
        left: "32px",
    },
};
