import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { SeoAuditForm } from '@/components/SeoAuditForm';
import { SeoResultsDisplay } from '@/components/SeoResultsDisplay';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { SeoAnalyzer, PageAnalysis } from '@/utils/SeoAnalyzer';

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyses, setAnalyses] = useState<PageAnalysis[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const handleAuditSubmit = async (url: string, maxPages: number) => {

    setIsLoading(true);
    setProgress(0);
    setAnalyses([]);
    setSummary(null);
    
    try {
      toast({
        title: "Starting SEO Audit",
        description: `Crawling ${url} (max ${maxPages} pages)...`,
      });

      setProgress(10);
      
      const result = await FirecrawlService.crawlWebsite(url, maxPages);
      
      if (!result.success) {
        toast({
          title: "Crawl Failed",
          description: result.error || "Failed to crawl website",
          variant: "destructive",
        });
        return;
      }

      setProgress(50);

      // Analyze each page
      const pageAnalyses: PageAnalysis[] = [];
      const crawlData = result.data;
      
      if (crawlData && crawlData.data && Array.isArray(crawlData.data)) {
        const totalPages = crawlData.data.length;
        
        for (let i = 0; i < crawlData.data.length; i++) {
          const page = crawlData.data[i];
          if (page.html && page.metadata?.sourceURL) {
            const analysis = SeoAnalyzer.analyzePage(page.metadata.sourceURL, page.html);
            pageAnalyses.push(analysis);
          }
          
          // Update progress
          const currentProgress = 50 + ((i + 1) / totalPages) * 50;
          setProgress(Math.round(currentProgress));
        }
      }

      // Generate summary
      const summaryData = SeoAnalyzer.generateSummary(pageAnalyses);
      
      setAnalyses(pageAnalyses);
      setSummary(summaryData);
      setProgress(100);

      toast({
        title: "SEO Audit Complete",
        description: `Analyzed ${pageAnalyses.length} pages with ${summaryData.totalIssues} total issues found.`,
      });

    } catch (error) {
      console.error('Error during SEO audit:', error);
      toast({
        title: "Audit Failed",
        description: "An error occurred during the SEO audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <SeoAuditForm
          onSubmit={handleAuditSubmit}
          isLoading={isLoading}
          progress={progress}
        />

        {analyses.length > 0 && summary && (
          <SeoResultsDisplay analyses={analyses} summary={summary} />
        )}
      </div>
    </div>
  );
};

export default Index;
