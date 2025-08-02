export interface SeoIssue {
  type: 'error' | 'warning' | 'info';
  category: 'title' | 'meta_description' | 'h1' | 'images';
  message: string;
  details?: string;
}

export interface PageAnalysis {
  url: string;
  title: string;
  issues: SeoIssue[];
  score: number;
  crawled: boolean;
  seoDetails: {
    titleText: string | null;
    metaDescription: string | null;
    h1Tags: { text: string; count: number }[];
    imagesWithoutAlt: { src: string; alt: string | null }[];
  };
}

export class SeoAnalyzer {
  static analyzePage(url: string, html: string): PageAnalysis {
    const issues: SeoIssue[] = [];
    let score = 100;

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Check title tag
    const titleElement = doc.querySelector('title');
    if (!titleElement || !titleElement.textContent?.trim()) {
      issues.push({
        type: 'error',
        category: 'title',
        message: 'Missing title tag',
        details: 'Every page should have a unique title tag for SEO'
      });
      score -= 20;
    } else if (titleElement.textContent.length > 60) {
      issues.push({
        type: 'warning',
        category: 'title',
        message: 'Title tag too long',
        details: `Title is ${titleElement.textContent.length} characters. Recommended: 50-60 characters`
      });
      score -= 10;
    } else if (titleElement.textContent.length < 30) {
      issues.push({
        type: 'warning',
        category: 'title',
        message: 'Title tag too short',
        details: `Title is ${titleElement.textContent.length} characters. Recommended: 30-60 characters`
      });
      score -= 5;
    }

    // Check meta description
    const metaDescription = doc.querySelector('meta[name="description"]');
    if (!metaDescription || !metaDescription.getAttribute('content')?.trim()) {
      issues.push({
        type: 'error',
        category: 'meta_description',
        message: 'Missing meta description',
        details: 'Meta descriptions help search engines understand your page content'
      });
      score -= 20;
    } else {
      const content = metaDescription.getAttribute('content') || '';
      if (content.length > 160) {
        issues.push({
          type: 'warning',
          category: 'meta_description',
          message: 'Meta description too long',
          details: `Description is ${content.length} characters. Recommended: 120-160 characters`
        });
        score -= 10;
      } else if (content.length < 120) {
        issues.push({
          type: 'warning',
          category: 'meta_description',
          message: 'Meta description too short',
          details: `Description is ${content.length} characters. Recommended: 120-160 characters`
        });
        score -= 5;
      }
    }

    // Check H1 tags
    const h1Elements = doc.querySelectorAll('h1');
    if (h1Elements.length === 0) {
      issues.push({
        type: 'error',
        category: 'h1',
        message: 'Missing H1 tag',
        details: 'Every page should have exactly one H1 tag for SEO hierarchy'
      });
      score -= 15;
    } else if (h1Elements.length > 1) {
      issues.push({
        type: 'warning',
        category: 'h1',
        message: 'Multiple H1 tags found',
        details: `Found ${h1Elements.length} H1 tags. Recommended: exactly 1 H1 per page`
      });
      score -= 10;
    }

    // Check images without alt attributes
    const images = doc.querySelectorAll('img');
    const imagesWithoutAlt: { src: string; alt: string | null }[] = [];
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      const src = img.getAttribute('src') || '';
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt.push({ src, alt });
      }
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        category: 'images',
        message: `${imagesWithoutAlt.length} images without alt attributes`,
        details: 'Alt attributes improve accessibility and help search engines understand image content'
      });
      score -= Math.min(imagesWithoutAlt.length * 2, 15);
    }

    // Collect H1 tag details
    const h1TagDetails = Array.from(h1Elements).map(h1 => h1.textContent?.trim() || '');

    // Extract page title - use the actual title tag content
    let pageTitle = 'No title';
    const titleText = titleElement?.textContent?.trim();
    
    if (titleText && titleText.length > 0) {
      pageTitle = titleText;
    } else {
      // If no title tag, try to get title from H1 or URL as fallback
      const firstH1 = h1Elements.length > 0 ? h1Elements[0]?.textContent?.trim() : '';
      if (firstH1 && firstH1.length > 3) {
        pageTitle = firstH1;
      } else {
        // Extract meaningful part from URL as last resort
        try {
          const urlPath = new URL(url).pathname;
          const pathParts = urlPath.split('/').filter(part => part.length > 0);
          if (pathParts.length > 0) {
            pageTitle = pathParts[pathParts.length - 1]
              .replace(/-/g, ' ')
              .replace(/_/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ') || 'No title';
          }
        } catch {
          pageTitle = 'No title';
        }
      }
    }

    return {
      url,
      title: pageTitle,
      issues,
      score: Math.max(0, score),
      crawled: true,
      seoDetails: {
        titleText: titleElement?.textContent?.trim() || null,
        metaDescription: metaDescription?.getAttribute('content')?.trim() || null,
        h1Tags: [{ text: h1TagDetails.join(', '), count: h1Elements.length }],
        imagesWithoutAlt
      }
    };
  }

  static generateSummary(analyses: PageAnalysis[]) {
    const totalPages = analyses.length;
    const totalIssues = analyses.reduce((sum, page) => sum + page.issues.length, 0);
    const averageScore = analyses.reduce((sum, page) => sum + page.score, 0) / totalPages;
    
    const issuesByType = {
      error: 0,
      warning: 0,
      info: 0
    };

    const issuesByCategory = {
      title: 0,
      meta_description: 0,
      h1: 0,
      images: 0
    };

    analyses.forEach(page => {
      page.issues.forEach(issue => {
        issuesByType[issue.type]++;
        issuesByCategory[issue.category]++;
      });
    });

    return {
      totalPages,
      totalIssues,
      averageScore: Math.round(averageScore),
      issuesByType,
      issuesByCategory,
      topIssues: Object.entries(issuesByCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }))
    };
  }
}

export interface SeoDataRow {
  url: string;
  titleContent: string;
  titleIssue: string;
  metaDescription: string;
  metaIssue: string;
  h1Count: number;
  h1Content: string;
  h1Issue: string;
  imagesWithoutAlt: number;
  totalImages: number;
  titleSuggestion: string;
  metaSuggestion: string;
  h1Suggestion: string;
  imageSuggestion: string;
}

export class SeoDataExtractor {
  /**
   * Extract structured SEO data from crawled pages with suggestions
   */
  static extractSeoData(analyses: PageAnalysis[]): SeoDataRow[] {
    return analyses.map(analysis => {
      // Title analysis
      const titleContent = analysis.seoDetails.titleText || 'MISSING';
      const titleLength = titleContent === 'MISSING' ? 0 : titleContent.length;
      let titleIssue = 'Good';
      let titleSuggestion = 'Your title tag is well optimized.';
      
      if (!analysis.seoDetails.titleText) {
        titleIssue = 'Missing';
        titleSuggestion = 'Add a unique, descriptive title tag (30-60 characters) that includes your main keyword.';
      } else if (titleLength > 60) {
        titleIssue = 'Too Long';
        titleSuggestion = `Shorten your title to 50-60 characters (currently ${titleLength}). Focus on your main keyword and value proposition.`;
      } else if (titleLength < 30) {
        titleIssue = 'Too Short';
        titleSuggestion = `Expand your title to 30-60 characters (currently ${titleLength}). Add more descriptive keywords.`;
      }

      // Meta description analysis
      const metaDescription = analysis.seoDetails.metaDescription || 'MISSING';
      const metaLength = metaDescription === 'MISSING' ? 0 : metaDescription.length;
      let metaIssue = 'Good';
      let metaSuggestion = 'Your meta description is well optimized.';
      
      if (!analysis.seoDetails.metaDescription) {
        metaIssue = 'Missing';
        metaSuggestion = 'Add a compelling meta description (120-160 characters) that summarizes your page and includes relevant keywords.';
      } else if (metaLength > 160) {
        metaIssue = 'Too Long';
        metaSuggestion = `Shorten your meta description to 120-160 characters (currently ${metaLength}). Focus on the most important benefits.`;
      } else if (metaLength < 120) {
        metaIssue = 'Too Short';
        metaSuggestion = `Expand your meta description to 120-160 characters (currently ${metaLength}). Add more compelling details.`;
      }

      // H1 analysis
      const h1Count = analysis.seoDetails.h1Tags[0]?.count || 0;
      const h1Content = analysis.seoDetails.h1Tags[0]?.text || 'MISSING';
      let h1Issue = 'Good';
      let h1Suggestion = 'Your H1 tag structure is optimized.';
      
      if (h1Count === 0) {
        h1Issue = 'Missing';
        h1Suggestion = 'Add exactly one H1 tag that clearly describes your page content and includes your main keyword.';
      } else if (h1Count > 1) {
        h1Issue = 'Multiple H1s';
        h1Suggestion = `Use only one H1 tag per page (you have ${h1Count}). Convert extra H1s to H2 or H3 tags for proper hierarchy.`;
      }

      // Images analysis
      const imagesWithoutAlt = analysis.seoDetails.imagesWithoutAlt.length;
      let imageSuggestion = 'All images have alt text - great for accessibility!';
      
      if (imagesWithoutAlt > 0) {
        imageSuggestion = `Add descriptive alt text to ${imagesWithoutAlt} image(s). Alt text helps screen readers and search engines understand your images.`;
      }

      return {
        url: analysis.url,
        titleContent,
        titleIssue,
        metaDescription,
        metaIssue,
        h1Count,
        h1Content,
        h1Issue,
        imagesWithoutAlt,
        totalImages: 0, // We'll enhance this if needed
        titleSuggestion,
        metaSuggestion,
        h1Suggestion,
        imageSuggestion
      };
    });
  }

  /**
   * Generate summary report from SEO data
   */
  static generateSummaryReport(seoData: SeoDataRow[]) {
    const totalPages = seoData.length;
    const pagesWithMissingTitles = seoData.filter(row => row.titleIssue === 'Missing').length;
    const pagesWithMissingMetaDesc = seoData.filter(row => row.metaIssue === 'Missing').length;
    const pagesWithNoH1 = seoData.filter(row => row.h1Count === 0).length;
    const pagesWithMultipleH1 = seoData.filter(row => row.h1Count > 1).length;
    const totalImagesWithoutAlt = seoData.reduce((sum, row) => sum + row.imagesWithoutAlt, 0);

    return {
      totalPages,
      issues: {
        missingTitles: {
          count: pagesWithMissingTitles,
          percentage: Math.round((pagesWithMissingTitles / totalPages) * 100)
        },
        missingMetaDescriptions: {
          count: pagesWithMissingMetaDesc,
          percentage: Math.round((pagesWithMissingMetaDesc / totalPages) * 100)
        },
        noH1Tags: {
          count: pagesWithNoH1,
          percentage: Math.round((pagesWithNoH1 / totalPages) * 100)
        },
        multipleH1Tags: {
          count: pagesWithMultipleH1,
          percentage: Math.round((pagesWithMultipleH1 / totalPages) * 100)
        },
        imagesWithoutAlt: {
          total: totalImagesWithoutAlt,
          averagePerPage: Math.round(totalImagesWithoutAlt / totalPages)
        }
      }
    };
  }

  /**
   * Convert SEO data to beginner-friendly CSV format
   */
  static convertToCSV(seoData: SeoDataRow[]): string {
    const headers = [
      'Page URL',
      'Current Title Tag',
      'Title Issue',
      'Title Recommendation',
      'Current Meta Description', 
      'Meta Issue',
      'Meta Recommendation',
      'H1 Count',
      'H1 Content',
      'H1 Issue',
      'H1 Recommendation',
      'Images Missing Alt Text',
      'Image Recommendation'
    ];

    const csvRows = [
      headers.join(','),
      ...seoData.map(row => [
        `"${row.url}"`,
        `"${row.titleContent}"`,
        `"${row.titleIssue}"`,
        `"${row.titleSuggestion}"`,
        `"${row.metaDescription}"`,
        `"${row.metaIssue}"`,
        `"${row.metaSuggestion}"`,
        row.h1Count.toString(),
        `"${row.h1Content}"`,
        `"${row.h1Issue}"`,
        `"${row.h1Suggestion}"`,
        row.imagesWithoutAlt.toString(),
        `"${row.imageSuggestion}"`
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Download CSV file
   */
  static downloadCSV(seoData: SeoDataRow[], filename: string = 'seo-audit-report.csv'): void {
    const csvContent = this.convertToCSV(seoData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}