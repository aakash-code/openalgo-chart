/**
 * Risk Calculator Template Management
 * Stores and retrieves preset risk calculator configurations
 */

const STORAGE_KEY = 'riskCalculatorTemplates';

export const DEFAULT_TEMPLATES = [
  {
    id: 'conservative',
    name: 'Conservative',
    capital: 100000,
    riskPercent: 0.5,
    isDefault: false,
    isCustom: false
  },
  {
    id: 'moderate',
    name: 'Moderate',
    capital: 100000,
    riskPercent: 1.0,
    isDefault: false,
    isCustom: false
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    capital: 100000,
    riskPercent: 2.0,
    isDefault: false,
    isCustom: false
  }
];

/**
 * Get all templates (default + custom)
 */
export const getTemplates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  } catch (error) {
    console.error('Error loading templates:', error);
    return DEFAULT_TEMPLATES;
  }
};

/**
 * Save a new custom template
 */
export const saveTemplate = (template) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];

    const newTemplate = {
      id: `custom_${Date.now()}`,
      name: template.name,
      capital: template.capital,
      riskPercent: template.riskPercent,
      isCustom: true,
      isDefault: template.isDefault || false
    };

    // If this is being set as default, unset others
    if (newTemplate.isDefault) {
      customTemplates.forEach(t => t.isDefault = false);
    }

    customTemplates.push(newTemplate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));

    return newTemplate;
  } catch (error) {
    console.error('Error saving template:', error);
    return null;
  }
};

/**
 * Update existing template
 */
export const updateTemplate = (templateId, updates) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];

    const index = customTemplates.findIndex(t => t.id === templateId);
    if (index === -1) return false;

    // If setting as default, unset others
    if (updates.isDefault) {
      customTemplates.forEach(t => t.isDefault = false);
    }

    customTemplates[index] = { ...customTemplates[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));

    return true;
  } catch (error) {
    console.error('Error updating template:', error);
    return false;
  }
};

/**
 * Delete a custom template
 */
export const deleteTemplate = (templateId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const customTemplates = stored ? JSON.parse(stored) : [];

    const filtered = customTemplates.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
};

/**
 * Get the default template (if any)
 */
export const getDefaultTemplate = () => {
  const templates = getTemplates();
  return templates.find(t => t.isDefault) || null;
};
