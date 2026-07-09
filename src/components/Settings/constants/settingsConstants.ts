/**
 * Settings Constants
 * Default values and section definitions
 */
import { CHART_COLORS } from '../../../utils/colorUtils';

export interface ChartAppearance {
    candleUpColor: string;
    candleDownColor: string;
    wickUpColor: string;
    wickDownColor: string;
    showVerticalGridLines: boolean;
    showHorizontalGridLines: boolean;
    darkBackground: string;
    lightBackground: string;
    darkGridColor: string;
    lightGridColor: string;
    [key: string]: string | boolean;
}

export interface SettingsSection {
    id: string;
    label: string;
    iconPath?: string;
    useKeyboardIcon?: boolean;
}

// Default chart appearance for reset
export const DEFAULT_CHART_APPEARANCE: ChartAppearance = {
    candleUpColor: CHART_COLORS.UP.primary,
    candleDownColor: CHART_COLORS.DOWN.primary,
    wickUpColor: CHART_COLORS.UP.primary,
    wickDownColor: CHART_COLORS.DOWN.primary,
    showVerticalGridLines: true,
    showHorizontalGridLines: true,
    darkBackground: '#131722',
    lightBackground: '#ffffff',
    darkGridColor: '#2A2E39',
    lightGridColor: '#e0e3eb',
};

// Settings section definitions
export const SETTINGS_SECTIONS: SettingsSection[] = [
    {
        id: 'symbol',
        label: 'Symbol',
        iconPath: 'M17.5 20.5h4v-13h-4v13zm2-13v-3m0 16v3M6.5 17.5h4v-7h-4v7zm2-7v-3m0 10v3',
    },
    {
        id: 'scales',
        label: 'Scales',
        iconPath: 'M10.5 20.5a2 2 0 1 1-2-2m2 2a2 2 0 0 0-2-2m2 2h14m-16-2v-14m16 16L21 17m3.5 3.5L21 24M8.5 4.5L12 8M8.5 4.5L5 8',
    },
    {
        id: 'openalgo',
        label: 'OpenAlgo',
        iconPath: 'M14 5a2 2 0 0 0-2 2v2h4V7a2 2 0 0 0-2-2Zm3 4V7a3 3 0 1 0-6 0v2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-8 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8Zm5 3a1 1 0 0 0-.5.13v-.13a.5.5 0 0 0-1 0v2.5a.5.5 0 0 0 1 0v-.13A1 1 0 1 0 14 14Z',
    },
    {
        id: 'logging',
        label: 'Logging',
        iconPath: 'M4 6h20v2H4V6zm0 5h20v2H4v-2zm0 5h14v2H4v-2zm0 5h10v2H4v-2z',
    },
    {
        id: 'appearance',
        label: 'Appearance',
    },
    {
        id: 'shortcuts',
        label: 'Keyboard Shortcuts',
        useKeyboardIcon: true,
    },
];

export default {
    DEFAULT_CHART_APPEARANCE,
    SETTINGS_SECTIONS,
};
