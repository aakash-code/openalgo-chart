import { expect, Page, Locator } from '@playwright/test';

/**
 * Form data for risk calculator
 */
export interface RiskCalculatorFormData {
  capital?: number;
  riskPercent?: number;
  side?: 'BUY' | 'SELL';
  entryPrice?: number | string;
  stopLoss?: number | string;
  targetPrice?: number | string;
  riskRewardRatio?: number;
}

/**
 * Risk Calculator Fixture
 * Reusable helper functions for E2E testing the Risk Calculator feature
 */
export class RiskCalculatorFixture {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Selectors using text-based and attribute-based locators
  // These are more stable than CSS class selectors which may change
  selectors = {
    // Topbar indicator button and dropdown
    indicatorButton: 'button[aria-label="Indicators"]',
    indicatorDropdown: 'text=Risk Calculator',

    // Panel container (using data-testid would be better, but using CSS modules for now)
    panel: '[class*="panel"]:not([class*="panelMinimized"])',
    panelMinimized: '[class*="panelMinimized"]',

    // Header buttons
    closeButton: '[class*="closeButton"]',
    editButton: 'button[title="Edit"]',
    minimizeButton: 'button:has-text("")', // Contains Minimize2 icon
    maximizeButton: 'button:has-text("")', // Contains Maximize2 icon (in minimized panel)

    // Form inputs - using labels for more stable selectors
    capitalInput: 'label:has-text("Capital") + div input',
    riskPercentInput: 'label:has-text("Risk %") + div input',
    sideSelect: 'label:has-text("Side") + select',
    entryPriceInput: 'label:has-text("Entry Price") + div input',
    stopLossInput: 'label:has-text("Stop Loss") + div input',
    targetPriceInput: 'label:has-text("Target Price") + div input',
    rrRatioSelect: 'label:has-text("Risk : Reward") + select',

    // Buttons
    useLtpButton: '[class*="useLtp"]',
    calculateButton: '[class*="calculateButton"]',

    // Template selector
    templateSelect: '[class*="templateSelect"]',
    saveTemplateDialog: '[class*="dialogContent"]',
    dialogInput: '[class*="dialogInput"]',
    dialogSaveButton: '[class*="dialogSaveButton"]',
    dialogCancelButton: '[class*="dialogCancelButton"]',

    // Validation states
    inputError: '[class*="inputError"]',
    inputWarning: '[class*="inputWarning"]',
    inputValid: '[class*="inputValid"]',
    fieldError: '[class*="fieldError"]',
    fieldWarning: '[class*="fieldWarning"]',
    suggestionButton: '[class*="suggestionButton"]',
    validCheck: '[class*="validCheck"]',

    // Display values (in results view)
    displayCapital: 'span:has-text("Capital:") + span',
    displayRiskPercent: 'span:has-text("Risk %:") + span',
    displayRiskAmount: '[class*="risk"]',
    displayQuantity: '[class*="quantity"]',
    displayReward: '[class*="reward"]',
    displayTarget: '[class*="target"]',
    displayRRRatio: '[class*="rrRatio"]',

    // Canvas (for drag testing)
    canvas: 'canvas',
  };

  /**
   * Navigate to the app and wait for it to load
   */
  async navigateToApp(): Promise<void> {
    await this.page.goto('/');

    // Wait for page to load
    await this.page.waitForTimeout(1000);

    // Check if we're on the connection screen
    const connectionDialog = this.page.locator('text=Connect to OpenAlgo');
    const isConnectionScreen = await connectionDialog.isVisible().catch(() => false);

    if (isConnectionScreen) {
      // We're on the connection screen
      // Try clicking "Login to Dashboard" button which should bypass API key
      const loginButton = this.page.locator('button:has-text("Login to Dashboard")');
      const isLoginVisible = await loginButton.isVisible().catch(() => false);

      if (isLoginVisible) {
        // Click the Login to Dashboard button
        await loginButton.click();

        // Wait for potential redirect or chart loading
        await this.page.waitForTimeout(3000);
      } else {
        // If no login button, try using localStorage to bypass auth
        // This is a workaround for E2E testing
        await this.page.evaluate(() => {
          localStorage.setItem('oa_apikey', '8319156e5247816c4b8974d5e687fe24156e7f1a8c68fecba62be4fc1ba128ea');
          localStorage.setItem('oa_host_url', 'http://127.0.0.1:8000');
        });
        await this.page.reload();
        await this.page.waitForTimeout(2000);
      }
    }

    // Wait for the chart to load - check for canvas element
    // Increase timeout since we may need to wait for data loading
    try {
      await this.page.waitForSelector(this.selectors.canvas, { timeout: 60000 });
    } catch (error) {
      // If canvas still not found, take screenshot for debugging
      await this.page.screenshot({ path: 'failed-to-load-canvas.png' });
      throw error;
    }

    // Wait a bit more for chart initialization
    await this.page.waitForTimeout(3000);
  }

  /**
   * Enable Risk Calculator from the indicator dropdown
   */
  async enable(): Promise<void> {
    // Click Indicators button
    await this.page.click(this.selectors.indicatorButton);

    // Wait for dropdown to appear
    await this.page.waitForSelector(this.selectors.indicatorDropdown, { timeout: 5000 });

    // Click Risk Calculator item
    await this.page.click(this.selectors.indicatorDropdown);

    // Wait for panel to appear
    await expect(this.page.locator(this.selectors.panel).first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close the Risk Calculator panel
   */
  async close(): Promise<void> {
    await this.page.click(this.selectors.closeButton);
    await expect(this.page.locator(this.selectors.panel).first()).not.toBeVisible();
  }

  /**
   * Switch to edit mode (if in results view)
   */
  async openEditMode(): Promise<void> {
    // Check if we're already in edit mode by looking for calculate button
    const calculateButton = this.page.locator(this.selectors.calculateButton);
    const isVisible = await calculateButton.isVisible().catch(() => false);

    if (!isVisible) {
      // We're in results view, click edit button
      await this.page.click(this.selectors.editButton);
      await expect(calculateButton).toBeVisible({ timeout: 2000 });
    }
  }

  /**
   * Fill form with values
   */
  async fillForm(data: RiskCalculatorFormData): Promise<void> {
    if (data.capital !== undefined) {
      await this.page.fill(this.selectors.capitalInput, String(data.capital));
    }
    if (data.riskPercent !== undefined) {
      await this.page.fill(this.selectors.riskPercentInput, String(data.riskPercent));
    }
    if (data.side) {
      await this.page.selectOption(this.selectors.sideSelect, data.side);
    }
    if (data.entryPrice !== undefined) {
      await this.page.fill(this.selectors.entryPriceInput, String(data.entryPrice));
    }
    if (data.stopLoss !== undefined) {
      await this.page.fill(this.selectors.stopLossInput, String(data.stopLoss));
    }
    if (data.targetPrice !== undefined) {
      await this.page.fill(this.selectors.targetPriceInput, String(data.targetPrice));
    }
    if (data.riskRewardRatio !== undefined) {
      await this.page.selectOption(this.selectors.rrRatioSelect, String(data.riskRewardRatio));
    }
  }

  /**
   * Click the Calculate button
   */
  async calculate(): Promise<void> {
    await this.page.click(this.selectors.calculateButton);
    // Wait for calculation to complete (edit mode to close)
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current side selection
   */
  async getCurrentSide(): Promise<string> {
    return await this.page.locator(this.selectors.sideSelect).inputValue();
  }

  /**
   * Get current input value
   */
  async getInputValue(inputName: string): Promise<string> {
    const selector = this.selectors[`${inputName}Input` as keyof typeof this.selectors];
    if (!selector) {
      throw new Error(`Unknown input: ${inputName}`);
    }
    return await this.page.locator(selector).inputValue();
  }

  /**
   * Check if calculate button is enabled
   */
  async isCalculateButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.calculateButton);
    return !(await button.isDisabled());
  }

  /**
   * Check if a field has an error
   */
  async hasFieldError(_fieldName: string): Promise<boolean> {
    const errorLocator = this.page.locator(this.selectors.fieldError);
    const count = await errorLocator.count();
    return count > 0;
  }

  /**
   * Get field error message
   */
  async getFieldErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator(this.selectors.fieldError).first();
    const isVisible = await errorLocator.isVisible().catch(() => false);
    if (isVisible) {
      return await errorLocator.textContent();
    }
    return null;
  }

  /**
   * Click suggestion button if available
   */
  async clickSuggestion(): Promise<void> {
    const suggestionButton = this.page.locator(this.selectors.suggestionButton).first();
    const isVisible = await suggestionButton.isVisible().catch(() => false);
    if (isVisible) {
      await suggestionButton.click();
    }
  }

  /**
   * Minimize the panel
   */
  async minimize(): Promise<void> {
    // Find and click the minimize button (contains Minimize2 icon)
    const buttons = await this.page.locator('[class*="iconButton"]').all();
    for (const button of buttons) {
      const svg = await button.locator('svg').count();
      if (svg > 0) {
        // This is an icon button - could be edit, minimize, etc.
        // The second icon button in header is typically minimize
        await button.click();
        break;
      }
    }
    await expect(this.page.locator(this.selectors.panelMinimized)).toBeVisible();
  }

  /**
   * Maximize the panel (from minimized state)
   */
  async maximize(): Promise<void> {
    const minimizedPanel = this.page.locator(this.selectors.panelMinimized);
    await minimizedPanel.locator('button').click();
    await expect(this.page.locator(this.selectors.panel).first()).toBeVisible();
  }

  /**
   * Select a template
   */
  async selectTemplate(templateValue: string): Promise<void> {
    await this.page.selectOption(this.selectors.templateSelect, templateValue);
    await this.page.waitForTimeout(300);
  }

  /**
   * Save current values as a new template
   */
  async saveTemplate(templateName: string): Promise<void> {
    // Select "Save Current..." option
    await this.page.selectOption(this.selectors.templateSelect, 'save_new');

    // Wait for dialog
    await expect(this.page.locator(this.selectors.saveTemplateDialog)).toBeVisible();

    // Enter name
    await this.page.fill(this.selectors.dialogInput, templateName);

    // Click save
    await this.page.click(this.selectors.dialogSaveButton);

    // Wait for dialog to close
    await expect(this.page.locator(this.selectors.saveTemplateDialog)).not.toBeVisible();
  }

  /**
   * Get canvas element
   */
  async getCanvas(): Promise<Locator> {
    return this.page.locator(this.selectors.canvas).first();
  }

  /**
   * Wait for calculation to complete
   * Just a helper to add a small delay for state updates
   */
  async waitForCalculation(): Promise<void> {
    await this.page.waitForTimeout(500);
  }

  /**
   * Setup console error tracking
   * Call this at the beginning of a test to track console errors
   */
  setupConsoleErrorTracking(): string[] {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Clear localStorage (useful for template tests)
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Get displayed quantity value
   */
  async getDisplayedQuantity(): Promise<string | null> {
    const locator = this.page.locator(this.selectors.displayQuantity);
    await expect(locator).toBeVisible();
    return await locator.textContent();
  }

  /**
   * Get displayed risk amount
   */
  async getDisplayedRiskAmount(): Promise<string | null> {
    const locator = this.page.locator(this.selectors.displayRiskAmount);
    await expect(locator).toBeVisible();
    return await locator.textContent();
  }
}

/**
 * Create a test fixture for Risk Calculator
 * Usage: const riskCalc = await createRiskCalculatorFixture(page);
 */
export async function createRiskCalculatorFixture(page: Page): Promise<RiskCalculatorFixture> {
  const fixture = new RiskCalculatorFixture(page);
  return fixture;
}
