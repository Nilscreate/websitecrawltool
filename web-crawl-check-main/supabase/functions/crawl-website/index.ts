import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Allowed domains for security (add more as needed)
const BLOCKED_DOMAINS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
const BLOCKED_PROTOCOLS = ['file:', 'ftp:', 'ssh:'];

function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    // Check for blocked protocols
    if (BLOCKED_PROTOCOLS.some(protocol => url.toLowerCase().startsWith(protocol))) {
      return { valid: false, error: 'Blocked protocol detected' };
    }
    
    // Check for blocked domains
    if (BLOCKED_DOMAINS.includes(parsedUrl.hostname)) {
      return { valid: false, error: 'Local or private URLs are not allowed' };
    }
    
    // Check for private IP ranges
    const hostname = parsedUrl.hostname;
    if (hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)/)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function checkRateLimit(clientIp: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIp);
  
  if (!clientData || (now - clientData.lastReset) > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(clientIp, { count: 1, lastReset: now });
    return { allowed: true };
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, error: 'Rate limit exceeded. Please try again later.' };
  }
  
  clientData.count++;
  return { allowed: true };
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Only return generic error messages to prevent information disclosure
    if (error.message.includes('API key') || error.message.includes('Authorization')) {
      return 'Authentication failed';
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Network error occurred';
    }
    return 'An error occurred while processing your request';
  }
  return 'Unknown error occurred';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: rateLimitCheck.error }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, maxPages = 2 } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL for security
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      console.warn(`Invalid URL attempted: ${url} from IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate maxPages parameter
    if (typeof maxPages !== 'number' || maxPages < 1 || maxPages > 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'maxPages must be a number between 1 and 50' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl for URL: ${url} with maxPages: ${maxPages}`);
    
    // Start the crawl job
    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        limit: maxPages,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        }
      }),
    });

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error('Firecrawl API error:', crawlResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to start crawl job. Please check your URL and try again.' 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const crawlJobResponse = await crawlResponse.json();
    console.log('Crawl job started:', crawlJobResponse);

    if (!crawlJobResponse.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: crawlJobResponse.error || 'Failed to start crawl job' 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll for crawl completion
    const jobId = crawlJobResponse.id;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 60 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
      
      console.log(`Polling crawl status (attempt ${attempts}/${maxAttempts})`);
      
      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        console.error('Error checking crawl status:', statusResponse.status);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Crawl status: ${statusData.status}, completed: ${statusData.completed || 0}/${statusData.total || 0}`);
      
      if (statusData.status === 'completed') {
        // Filter for HTML pages only
        const htmlPages = statusData.data?.filter((page: any) => {
          const url = page.metadata?.sourceURL || page.url || '';
          const contentType = page.metadata?.contentType || '';
          
          // Check if it's likely an HTML page
          const isHtmlUrl = !url.match(/\.(pdf|jpg|jpeg|png|gif|css|js|xml|json|zip|doc|docx)$/i);
          const isHtmlContent = contentType.includes('text/html') || contentType === '';
          
          return isHtmlUrl && isHtmlContent && page.markdown;
        }) || [];

        console.log(`Crawl completed. Filtered ${htmlPages.length} HTML pages from ${statusData.data?.length || 0} total pages`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: htmlPages 
          }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (statusData.status === 'failed') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Crawl job failed' 
          }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Continue polling if status is 'scraping' or 'waiting'
    }

    // Timeout after max attempts
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Crawl job timed out' 
      }), 
      { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in crawl-website function:', error);
    const sanitizedError = sanitizeError(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: sanitizedError 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});