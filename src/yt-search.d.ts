declare module 'yt-search' {
  interface VideoSearchResult {
    videoId: string;
    url: string;
    title: string;
    description: string;
    image: string;
    thumbnail: string;
    seconds: number;
    timestamp: string;
    duration: { seconds: number; timestamp: string };
    ago: string;
    views: number;
    author: { name: string; url: string };
  }

  interface SearchResult {
    videos: VideoSearchResult[];
  }

  interface SearchOptions {
    query: string;
  }

  function search(query: string | SearchOptions): Promise<SearchResult>;
  export default search;
}
