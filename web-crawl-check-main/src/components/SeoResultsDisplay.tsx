import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  FileText, 
  Image, 
  Heading1, 
  Tag,
  TrendingUp,
  Globe,
  Download,
  BarChart3,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { PageAnalysis, SeoIssue, SeoDataExtractor } from '@/utils/SeoAnalyzer';

interface SeoResultsDisplayProps {
  analyses: PageAnalysis[];
  summary: any;
}

const getIssueIcon = (type: SeoIssue['type']) => {
  switch (type) {
    case 'error':
      return <XCircle className="w-4 h-4 text-audit-error" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-audit-warning" />;
    case 'info':
      return <Info className="w-4 h-4 text-audit-info" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getCategoryIcon = (category: SeoIssue['category']) => {
  switch (category) {
    case 'title':
      return <FileText className="w-4 h-4" />;
    case 'meta_description':
      return <Tag className="w-4 h-4" />;
    case 'h1':
      return <Heading1 className="w-4 h-4" />;
    case 'images':
      return <Image className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-audit-pass';
  if (score >= 70) return 'text-audit-warning';
  return 'text-audit-error';
};

const getScoreBadgeVariant = (score: number) => {
  if (score >= 90) return 'default';
  if (score >= 70) return 'secondary';
  return 'destructive';
};

export const SeoResultsDisplay = ({ analyses, summary }: SeoResultsDisplayProps) => {
  const [openDetails, setOpenDetails] = useState<number[]>([]);
  
  const toggleDetails = (index: number) => {
    setOpenDetails(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleDownloadCSV = () => {
    const seoData = SeoDataExtractor.extractSeoData(analyses);
    const timestamp = new Date().toISOString().split('T')[0];
    SeoDataExtractor.downloadCSV(seoData, `seo-audit-${timestamp}.csv`);
  };

  const handleDownloadSummary = () => {
    const seoData = SeoDataExtractor.extractSeoData(analyses);
    const summaryReport = SeoDataExtractor.generateSummaryReport(seoData);
    
    const summaryContent = `SEO Audit Summary Report
Generated: ${new Date().toLocaleDateString()}

OVERVIEW:
- Total Pages: ${summaryReport.totalPages}
- Missing Titles: ${summaryReport.issues.missingTitles.count} (${summaryReport.issues.missingTitles.percentage}%)
- Missing Meta Descriptions: ${summaryReport.issues.missingMetaDescriptions.count} (${summaryReport.issues.missingMetaDescriptions.percentage}%)
- Pages with no H1: ${summaryReport.issues.noH1Tags.count} (${summaryReport.issues.noH1Tags.percentage}%)
- Pages with multiple H1: ${summaryReport.issues.multipleH1Tags.count} (${summaryReport.issues.multipleH1Tags.percentage}%)
- Total images without alt: ${summaryReport.issues.imagesWithoutAlt.total}
- Average images without alt per page: ${summaryReport.issues.imagesWithoutAlt.averagePerPage}

DETAILED BREAKDOWN:
${seoData.map(row => `
URL: ${row.url}
- Title: ${row.titleIssue} (${row.titleContent === 'MISSING' ? 'Missing' : row.titleContent.length + ' chars'})
- Meta Description: ${row.metaIssue} (${row.metaDescription === 'MISSING' ? 'Missing' : row.metaDescription.length + ' chars'})
- H1 Count: ${row.h1Count}
- Images without Alt: ${row.imagesWithoutAlt}
`).join('')}`;

    const blob = new Blob([summaryContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `seo-summary-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Summary Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            SEO Audit Summary
          </CardTitle>
          <CardDescription>
            Overall analysis of {summary.totalPages} pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(summary.averageScore)}`}>
                {summary.averageScore}
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{summary.totalPages}</div>
              <div className="text-sm text-muted-foreground">Pages Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-audit-warning">{summary.totalIssues}</div>
              <div className="text-sm text-muted-foreground">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-audit-error">{summary.issuesByType.error}</div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
            </div>
          </div>

          {summary.topIssues.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Top Issues to Fix</h4>
              <div className="flex flex-wrap gap-2">
                {summary.topIssues.map((issue: any) => (
                  <Badge key={issue.category} variant="outline" className="flex items-center gap-1">
                    {getCategoryIcon(issue.category)}
                    {issue.category.replace('_', ' ')}: {issue.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={handleDownloadCSV} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download CSV Report
            </Button>
            <Button onClick={handleDownloadSummary} variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Download Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Page Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Page Analysis Results
        </h3>
        
        {analyses.map((page, index) => (
          <Card key={index} className="overflow-hidden">
            <div 
              className="cursor-pointer select-none"
              onClick={() => toggleDetails(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <CardTitle className="text-base sm:text-lg truncate">{page.title}</CardTitle>
                    <CardDescription className="truncate text-sm">{page.url}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getScoreBadgeVariant(page.score)} className="text-xs">
                      {page.score}
                    </Badge>
                    {openDetails.includes(index) ? 
                      <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>
                <Progress value={page.score} className="w-full h-2" />
                
                {/* Issues Summary - Always Visible */}
                {page.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {page.issues.slice(0, 3).map((issue, issueIndex) => (
                      <Badge key={issueIndex} variant="outline" className="text-xs flex items-center gap-1">
                        {getIssueIcon(issue.type)}
                        <span className="hidden sm:inline">{issue.category.replace('_', ' ')}</span>
                        <span className="sm:hidden">{issue.category.charAt(0).toUpperCase()}</span>
                      </Badge>
                    ))}
                    {page.issues.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{page.issues.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                
                {page.issues.length === 0 && (
                  <div className="flex items-center gap-2 text-audit-pass mt-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">No issues found</span>
                  </div>
                )}
              </CardHeader>
            </div>

            <Collapsible open={openDetails.includes(index)}>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Issues Detail */}
                  {page.issues.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Issues Found:</h4>
                      {page.issues.map((issue, issueIndex) => (
                        <Alert key={issueIndex} className="border-l-4 text-sm" style={{
                          borderLeftColor: issue.type === 'error' ? 'hsl(var(--audit-error))' : 
                                          issue.type === 'warning' ? 'hsl(var(--audit-warning))' : 
                                          'hsl(var(--audit-info))'
                        }}>
                          <div className="flex items-start gap-2">
                            {getIssueIcon(issue.type)}
                            {getCategoryIcon(issue.category)}
                            <div className="flex-1">
                              <div className="font-medium">{issue.message}</div>
                              {issue.details && (
                                <AlertDescription className="mt-1 text-xs">
                                  {issue.details}
                                </AlertDescription>
                              )}
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Page Content Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Page Content:</h4>
                    
                    {/* Title */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Title Tag</span>
                      </div>
                      {page.seoDetails.titleText ? (
                        <div className="bg-muted p-2 rounded text-xs font-mono break-words">
                          "{page.seoDetails.titleText}"
                        </div>
                      ) : (
                        <div className="text-audit-error text-xs font-medium">
                          Missing title tag
                        </div>
                      )}
                      {page.seoDetails.titleText && (
                        <div className="text-xs text-muted-foreground">
                          {page.seoDetails.titleText.length} characters
                        </div>
                      )}
                    </div>

                    {/* Meta Description */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Meta Description</span>
                      </div>
                      {page.seoDetails.metaDescription ? (
                        <div className="bg-muted p-2 rounded text-xs break-words">
                          "{page.seoDetails.metaDescription}"
                        </div>
                      ) : (
                        <div className="text-audit-error text-xs font-medium">
                          Missing meta description
                        </div>
                      )}
                      {page.seoDetails.metaDescription && (
                        <div className="text-xs text-muted-foreground">
                          {page.seoDetails.metaDescription.length} characters
                        </div>
                      )}
                    </div>

                    {/* H1 Tags */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Heading1 className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">H1 Tags ({page.seoDetails.h1Tags[0]?.count || 0})</span>
                      </div>
                      {page.seoDetails.h1Tags[0]?.count > 0 ? (
                        <div className="bg-muted p-2 rounded text-xs break-words">
                          {page.seoDetails.h1Tags[0].text || "H1 content empty"}
                        </div>
                      ) : (
                        <div className="text-audit-error text-xs font-medium">
                          No H1 tags found
                        </div>
                      )}
                    </div>

                    {/* Images Without Alt */}
                    {page.seoDetails.imagesWithoutAlt.length > 0 && (
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Images Missing Alt Text ({page.seoDetails.imagesWithoutAlt.length})</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {page.seoDetails.imagesWithoutAlt.slice(0, 5).map((img, imgIndex) => (
                            <div key={imgIndex} className="bg-muted p-2 rounded">
                              <div className="font-mono text-xs break-all">
                                {img.src.length > 50 ? `...${img.src.slice(-50)}` : img.src}
                              </div>
                            </div>
                          ))}
                          {page.seoDetails.imagesWithoutAlt.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              +{page.seoDetails.imagesWithoutAlt.length - 5} more images
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};