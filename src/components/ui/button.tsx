import React from 'react';
import { Button as CommonButton } from '../common';

export type ButtonProps = React.ComponentProps<typeof CommonButton>;

// Re-export the Button component from common
export const Button = CommonButton;

export default Button; 