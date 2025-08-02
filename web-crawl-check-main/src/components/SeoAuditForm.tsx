import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search, Globe, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface SeoAuditFormProps {
  onSubmit: (url: string, maxPages: number) => void;
  isLoading: boolean;
  progress: number;
}
export const SeoAuditForm = ({
  onSubmit,
  isLoading,
  progress
}: SeoAuditFormProps) => {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(2);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), Math.min(maxPages, 2)); // Enforce max 2 pages
    }
  };
  const handleMaxPagesChange = (value: string) => {
    const num = parseInt(value) || 1;
    setMaxPages(Math.min(num, 2)); // Enforce max 2 pages
  };
  return <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <img src="/lovable-uploads/f8a7fa56-e9b2-4321-83d7-f8013449c778.png" alt="Pixels & Numbers Logo" className="h-12 w-12" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2 text-2xl font-semibold">
          
          Pixels & Numbers SEO Audit Tool
        </CardTitle>
        <CardDescription className="text-base mt-3">
          Analyze websites for common SEO issues: missing titles, meta descriptions, H1 tags, and image alt attributes.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="website-url" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website URL
            </Label>
            <Input id="website-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" required disabled={isLoading} className="text-base" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-pages">
              Maximum Pages to Crawl (1-2)
            </Label>
            <Input id="max-pages" type="number" min="1" max="2" value={maxPages} onChange={e => handleMaxPagesChange(e.target.value)} disabled={isLoading} className="text-base" />
            <p className="text-xs text-muted-foreground">
              Free tier limited to 2 pages. Need more? Contact <a href="mailto:nilsgoldingers@pixelsandnumbers.com" className="text-primary underline hover:text-primary/80">nilsgoldingers@pixelsandnumbers.com</a>
            </p>
          </div>

          {isLoading && <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Analyzing website...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>}

          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              This tool will check each page for: missing title tags, missing meta descriptions, 
              missing or multiple H1 tags, and images without alt attributes.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={isLoading || !url.trim()} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium" size="lg">
            {isLoading ? "Crawling Website..." : "Start SEO Audit"}
          </Button>
        </form>
      </CardContent>
    </Card>;
};