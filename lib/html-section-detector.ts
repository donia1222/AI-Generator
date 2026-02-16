/**
 * HTMLSectionDetector - Extracts sections from HTML
 * Supports both marker-based and semantic detection
 */

export interface HTMLSection {
  name: string;           // "hero", "navbar", etc.
  content: string;        // HTML of the section
  startIndex: number;     // Position start in original HTML
  endIndex: number;       // Position end in original HTML
  hasMarker: boolean;     // If it has markers or was detected semantically
}

export class HTMLSectionDetector {
  /**
   * Extract a specific section from HTML by name
   */
  static extractSection(html: string, sectionName: string): HTMLSection | null {
    // Try marker-based detection first
    const markerSection = this.extractWithMarkers(html, sectionName);
    if (markerSection) {
      return markerSection;
    }

    // Fallback to semantic detection
    console.warn(`Using semantic detection for section: ${sectionName}`);
    return this.detectSemantically(html, sectionName);
  }

  /**
   * Extract all detectable sections from HTML
   */
  static extractAllSections(html: string): HTMLSection[] {
    const sections: HTMLSection[] = [];
    const sectionNames = ['navbar', 'hero', 'features', 'about', 'testimonials', 'cta', 'footer'];

    for (const name of sectionNames) {
      const section = this.extractSection(html, name);
      if (section) {
        sections.push(section);
      }
    }

    return sections;
  }

  /**
   * Extract section using HTML comment markers
   * <!-- SECTION:HERO -->...<!-- /SECTION:HERO -->
   */
  private static extractWithMarkers(html: string, sectionName: string): HTMLSection | null {
    const upperName = sectionName.toUpperCase();
    const startMarker = `<!-- SECTION:${upperName} -->`;
    const endMarker = `<!-- /SECTION:${upperName} -->`;

    const startIndex = html.indexOf(startMarker);
    if (startIndex === -1) {
      return null;
    }

    const contentStart = startIndex + startMarker.length;
    const endIndex = html.indexOf(endMarker, contentStart);
    if (endIndex === -1) {
      console.warn(`Found start marker for ${sectionName} but no end marker`);
      return null;
    }

    const content = html.substring(contentStart, endIndex).trim();

    return {
      name: sectionName,
      content,
      startIndex,
      endIndex: endIndex + endMarker.length,
      hasMarker: true,
    };
  }

  /**
   * Detect section semantically using regex patterns
   * Fallback when markers are not present
   */
  private static detectSemantically(html: string, sectionName: string): HTMLSection | null {
    const patterns = this.getSemanticPatterns(sectionName);

    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) {
        return {
          name: sectionName,
          content: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          hasMarker: false,
        };
      }
    }

    return null;
  }

  /**
   * Get regex patterns for semantic section detection
   */
  private static getSemanticPatterns(sectionName: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      navbar: [
        /<nav[\s\S]*?<\/nav>/i,
        /<header[\s\S]*?<\/header>/i,
      ],
      hero: [
        /<section[^>]*class="[^"]*hero[^"]*"[\s\S]*?<\/section>/i,
        /<div[^>]*class="[^"]*hero[^"]*"[\s\S]*?<\/div>/i,
        /<section[^>]*id="hero"[\s\S]*?<\/section>/i,
      ],
      features: [
        /<section[^>]*class="[^"]*features[^"]*"[\s\S]*?<\/section>/i,
        /<div[^>]*class="[^"]*features[^"]*"[\s\S]*?<\/div>/i,
        /<section[^>]*id="features"[\s\S]*?<\/section>/i,
      ],
      about: [
        /<section[^>]*class="[^"]*about[^"]*"[\s\S]*?<\/section>/i,
        /<div[^>]*class="[^"]*about[^"]*"[\s\S]*?<\/div>/i,
        /<section[^>]*id="about"[\s\S]*?<\/section>/i,
      ],
      testimonials: [
        /<section[^>]*class="[^"]*testimonial[^"]*"[\s\S]*?<\/section>/i,
        /<div[^>]*class="[^"]*testimonial[^"]*"[\s\S]*?<\/div>/i,
        /<section[^>]*id="testimonial"[\s\S]*?<\/section>/i,
      ],
      cta: [
        /<section[^>]*class="[^"]*cta[^"]*"[\s\S]*?<\/section>/i,
        /<div[^>]*class="[^"]*cta[^"]*"[\s\S]*?<\/div>/i,
        /<section[^>]*class="[^"]*call-to-action[^"]*"[\s\S]*?<\/section>/i,
      ],
      footer: [
        /<footer[\s\S]*?<\/footer>/i,
      ],
    };

    return patterns[sectionName.toLowerCase()] || [];
  }
}
