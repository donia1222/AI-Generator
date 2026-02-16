/**
 * ModificationAnalyzer - Analyzes user's modification intent
 * Determines the best strategy for applying changes
 */

export interface ModificationIntent {
  strategy: 'incremental' | 'cross-section' | 'full-regen';
  targetSections: string[];    // ["hero"], ["navbar", "footer"], etc.
  affectsGlobal: boolean;      // true if says "all", "every", etc.
  complexity: 'simple' | 'moderate' | 'complex';
  reasoning: string;           // For logs/debugging
}

export class ModificationAnalyzer {
  /**
   * Analyze the modification prompt and determine the best strategy
   */
  static analyze(modificationPrompt: string): ModificationIntent {
    const lowerPrompt = modificationPrompt.toLowerCase();

    // Check for structural/complex changes
    if (this.isStructuralChange(lowerPrompt)) {
      return {
        strategy: 'full-regen',
        targetSections: [],
        affectsGlobal: false,
        complexity: 'complex',
        reasoning: 'Structural change detected (add/remove/reorganize sections)',
      };
    }

    // Check for global changes
    const isGlobal = this.isGlobalChange(lowerPrompt);
    if (isGlobal) {
      return {
        strategy: 'cross-section',
        targetSections: [],
        affectsGlobal: true,
        complexity: 'moderate',
        reasoning: 'Global change affecting multiple sections',
      };
    }

    // Detect target sections
    const targetSections = this.detectTargetSections(lowerPrompt);

    // If we found 1-2 specific sections, use incremental
    if (targetSections.length >= 1 && targetSections.length <= 2) {
      return {
        strategy: 'incremental',
        targetSections,
        affectsGlobal: false,
        complexity: 'simple',
        reasoning: `Targeting specific section(s): ${targetSections.join(', ')}`,
      };
    }

    // If we found 3+ sections, use cross-section
    if (targetSections.length > 2) {
      return {
        strategy: 'cross-section',
        targetSections,
        affectsGlobal: false,
        complexity: 'moderate',
        reasoning: `Multiple sections (${targetSections.length}) detected`,
      };
    }

    // Default to full-regen if unsure
    return {
      strategy: 'full-regen',
      targetSections: [],
      affectsGlobal: false,
      complexity: 'moderate',
      reasoning: 'No specific sections detected, using full regeneration',
    };
  }

  /**
   * Check if the prompt indicates a structural change
   */
  private static isStructuralChange(prompt: string): boolean {
    const structuralKeywords = [
      'add section',
      'add a section',
      'new section',
      'create section',
      'remove section',
      'delete section',
      'reorganize',
      'restructure',
      'rearrange',
      'move section',
      'reorder',
    ];

    return structuralKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if the prompt indicates a global change
   */
  private static isGlobalChange(prompt: string): boolean {
    const globalKeywords = [
      'all ',
      'every ',
      'each ',
      'todo',
      'todos',
      'todas',
      'all the',
      'every single',
      'entire page',
      'whole page',
      'throughout',
      'everywhere',
    ];

    return globalKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Detect which sections the prompt is targeting
   */
  private static detectTargetSections(prompt: string): string[] {
    const sections: string[] = [];
    const sectionKeywords: Record<string, string[]> = {
      navbar: ['navbar', 'nav bar', 'navigation', 'menu', 'header'],
      hero: ['hero', 'banner', 'main section', 'top section'],
      features: ['features', 'feature section', 'benefits'],
      about: ['about', 'about section', 'about us'],
      testimonials: ['testimonial', 'testimonials', 'review', 'reviews'],
      cta: ['cta', 'call to action', 'call-to-action'],
      footer: ['footer', 'bottom'],
    };

    for (const [sectionName, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        sections.push(sectionName);
      }
    }

    // Also check for generic element targeting that might indicate a section
    if (sections.length === 0) {
      // Check for specific UI elements that typically belong to certain sections
      if (prompt.match(/logo|brand/i)) sections.push('navbar');
      if (prompt.match(/heading|title|headline/i) && !prompt.match(/footer/i)) {
        // Could be hero or other section, but likely hero
        if (!sections.includes('hero')) sections.push('hero');
      }
      if (prompt.match(/copyright|contact info/i)) sections.push('footer');
    }

    // Remove duplicates
    return [...new Set(sections)];
  }
}
