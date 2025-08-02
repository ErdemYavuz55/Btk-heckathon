interface ImageCache {
  [key: string]: { url: string; timestamp: number };
}

class ImageService {
  private cache: ImageCache = {};
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  private getCacheKey(topic: string, prompt: string): string {
    return `${topic}:${prompt.slice(0, 50)}`;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.cacheExpiry;
  }

  async fetchImage(topic: string, prompt: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(topic, prompt);
    
    // Check cache first
    const cached = this.cache[cacheKey];
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.url;
    }

    try {
      // 1. Try Wikimedia first
      const wikiUrl = await this.fetchFromWikimedia(topic);
      if (wikiUrl) {
        this.cache[cacheKey] = { url: wikiUrl, timestamp: Date.now() };
        return wikiUrl;
      }

      // 2. Fallback to Unsplash (if API key available)
      if (process.env.UNSPLASH_ACCESS_KEY) {
        const unsplashUrl = await this.fetchFromUnsplash(topic);
        if (unsplashUrl) {
          this.cache[cacheKey] = { url: unsplashUrl, timestamp: Date.now() };
          return unsplashUrl;
        }
      }

      // 3. Last resort: generate with Gemini Image (placeholder)
      const geminiImageUrl = await this.fetchFromGeminiImage(topic, prompt);
      if (geminiImageUrl) {
        this.cache[cacheKey] = { url: geminiImageUrl, timestamp: Date.now() };
        return geminiImageUrl;
      }

    } catch (error) {
      console.warn('Image service error:', error);
    }

    return null;
  }

  private async fetchFromWikimedia(topic: string): Promise<string | null> {
    try {
      const searchQuery = encodeURIComponent(topic);
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${searchQuery}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.thumbnail?.source || null;
      }
    } catch (error) {
      console.warn('Wikimedia fetch failed:', error);
    }
    return null;
  }

  private async fetchFromUnsplash(topic: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=1`,
        {
          headers: {
            'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.results[0]?.urls?.regular || null;
      }
    } catch (error) {
      console.warn('Unsplash fetch failed:', error);
    }
    return null;
  }

  private async fetchFromGeminiImage(topic: string, prompt: string): Promise<string | null> {
    // Placeholder for Gemini Image API integration
    // In a real implementation, this would call Gemini's image generation API
    console.log(`Would generate image for: ${topic} - ${prompt}`);
    return null;
  }
}

export const imageService = new ImageService(); 