// Client-side types
export interface RecentUrl {
  url: string;
  domain: string;
  timestamp: number;
}

export interface Device {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  icon: string;
}