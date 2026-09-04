// data.ts
// Sample data for Userfeed component
// ============================================================

export interface FeedItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  mediaType: 'image' | 'video';
  publicId: string | null;
  created_at: string;
  time: string;
  type: 'post' | 'advert'; // To distinguish between posts and adverts
}

// Sample data with one record
export const feedData: FeedItem[] = [
  {
    id: '1',
    title: 'Beautiful Mountain Sunset',
    description: 'A breathtaking view of the mountains during sunset with golden rays piercing through the clouds. This stunning landscape captures the essence of nature\'s beauty at its finest moment.',
    url: 'https://www.youtube.com/watch?v=2YapAxPfRyI&list=RD2YapAxPfRyI&start_radio=1',
    mediaType: 'video',
    publicId: null,
    created_at: '2026-09-04T10:30:00Z',
    time: '2 hours ago',
    type: 'advert'
  }
];