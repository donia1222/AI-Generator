/**
 * HTMLMerger - Merges modified sections back into original HTML
 * Includes validation to ensure the result is valid
 */

import { HTMLSection } from './html-section-detector';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class HTMLMerger {
  /**
   * Replace a single section in the original HTML
   */
  static replaceSection(
    originalHTML: string,
    section: HTMLSection,
    modifiedContent: string
  ): string {
    return this.replaceSections(originalHTML, [{ section, newContent: modifiedContent }]);
  }

  /**
   * Replace multiple sections in the original HTML
   */
  static replaceSections(
    originalHTML: string,
    replacements: Array<{ section: HTMLSection; newContent: string }>
  ): string {
    // Sort replacements by startIndex in descending order
    // This allows us to replace from the end to the beginning without affecting indices
    const sorted = [...replacements].sort((a, b) => b.section.startIndex - a.section.startIndex);

    let result = originalHTML;

    for (const { section, newContent } of sorted) {
      const before = result.substring(0, section.startIndex);
      const after = result.substring(section.endIndex);

      // If section had markers, preserve them
      if (section.hasMarker) {
        const upperName = section.name.toUpperCase();
        const startMarker = `<!-- SECTION:${upperName} -->\n`;
        const endMarker = `\n<!-- /SECTION:${upperName} -->`;
        result = before + startMarker + newContent + endMarker + after;
      } else {
        // No markers, just replace the content
        result = before + newContent + after;
      }
    }

    return result;
  }

  /**
   * Validate that the HTML is structurally valid
   */
  static validate(html: string): ValidationResult {
    const errors: string[] = [];

    // Check for basic HTML structure
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
      errors.push('Missing DOCTYPE declaration');
    }

    if (!html.includes('<html')) {
      errors.push('Missing <html> tag');
    }

    if (!html.includes('<body')) {
      errors.push('Missing <body> tag');
    }

    // Check for balanced tags (basic validation)
    const balanceCheck = this.checkTagBalance(html);
    if (!balanceCheck.valid) {
      errors.push(...balanceCheck.errors);
    }

    // Check minimum length (should be a real page, not just a snippet)
    if (html.length < 200) {
      errors.push('HTML too short, might be incomplete');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if HTML tags are balanced
   */
  private static checkTagBalance(html: string): ValidationResult {
    const errors: string[] = [];

    // List of self-closing tags that don't need closing tags
    const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'];

    // Extract all tags
    const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    const tags: Array<{ name: string; isClosing: boolean }> = [];

    let match;
    while ((match = tagPattern.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const isClosing = match[0].startsWith('</');

      // Skip self-closing tags
      if (selfClosing.includes(tagName)) continue;

      tags.push({ name: tagName, isClosing });
    }

    // Check balance using a stack
    const stack: string[] = [];

    for (const tag of tags) {
      if (!tag.isClosing) {
        stack.push(tag.name);
      } else {
        if (stack.length === 0) {
          errors.push(`Unexpected closing tag: </${tag.name}>`);
          continue;
        }

        const lastOpened = stack.pop();
        if (lastOpened !== tag.name) {
          errors.push(`Mismatched tags: opened <${lastOpened}>, closed </${tag.name}>`);
        }
      }
    }

    // Check for unclosed tags
    if (stack.length > 0) {
      errors.push(`Unclosed tags: ${stack.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract section content from AI response
   * Sometimes AI returns full HTML instead of just the section
   */
  static extractSectionFromResponse(response: string, sectionName: string): string {
    // If response contains DOCTYPE, it's probably full HTML
    if (response.includes('<!DOCTYPE') || response.includes('<!doctype')) {
      console.warn('AI returned full HTML instead of section, attempting to extract section');

      // Try to extract the section from the full HTML
      const upperName = sectionName.toUpperCase();
      const markerPattern = new RegExp(
        `<!-- SECTION:${upperName} -->([\\s\\S]*?)<!-- /SECTION:${upperName} -->`,
        'i'
      );

      const match = markerPattern.exec(response);
      if (match) {
        return match[1].trim();
      }

      // If no markers, log warning and return as-is
      console.warn('Could not extract section from AI response, using as-is');
    }

    return response.trim();
  }
}
