import { THEMES, DEFAULT_THEME } from '../styles/themes';

/**
 * Theme color configuration interface
 */
export interface ThemeColors {
    background: string;
    backgroundSecondary: string;
    surface: string;
    border: string;
    text: string;
    textSecondary: string;
    grid: string;
    [key: string]: string;
}

/**
 * Theme type definition
 */
export type ThemeType = 'dark' | 'light';

/**
 * Get chart colors based on the current theme ID.
 * @param themeId - The ID of the theme (e.g., 'dark', 'light', 'midnight').
 * @returns The color configuration for the chart.
 */
export const getChartTheme = (themeId: string): ThemeColors => {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    return theme.colors as unknown as ThemeColors;
};

/**
 * Get the generic theme type ('dark' or 'light')
 * @param themeId - The theme identifier
 * @returns 'dark' or 'light'
 */
export const getThemeType = (themeId: string): ThemeType => {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    return theme.type;
};
