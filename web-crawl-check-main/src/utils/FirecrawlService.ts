import { supabase } from '@/integrations/supabase/client';

export class FirecrawlService {
  static async crawlWebsite(url: string, maxPages: number = 2): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('Making crawl request via Supabase Edge Function');
      
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: {
          url,
          maxPages
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to crawl website' 
        };
      }

      if (!data.success) {
        return { 
          success: false, 
          error: data.error || 'Failed to crawl website' 
        };
      }

      console.log(`Successfully crawled ${data.data?.length || 0} pages`);
      return { 
        success: true,
        data: { data: data.data }
      };
    } catch (error) {
      console.error('Error during crawl:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to crawl service' 
      };
    }
  }

  static extractPageUrls(crawlData: any): string[] {
    if (!crawlData || !crawlData.data || !Array.isArray(crawlData.data)) {
      return [];
    }
    
    return crawlData.data.map(page => {
      return page.metadata?.sourceURL || page.url || '';
    }).filter(url => url.length > 0);
  }

  static async getPageUrls(url: string, maxPages: number = 30): Promise<{ success: boolean; error?: string; urls?: string[] }> {
    try {
      const result = await this.crawlWebsite(url, maxPages);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const urls = this.extractPageUrls(result.data);
      return { success: true, urls };
    } catch (error) {
      console.error('Error getting page URLs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get page URLs' 
      };
    }
  }
}