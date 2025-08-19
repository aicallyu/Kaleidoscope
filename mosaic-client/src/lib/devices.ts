export interface Device {
  id: string;
  name: string;
  width: number;
  height: number;
  type: 'mobile' | 'tablet' | 'desktop';
  category: string;
  icon: string;
}

export const devices: Device[] = [
  // Mobile Devices
  {
    id: 'iphone-14',
    name: 'iPhone 14',
    width: 390,
    height: 844,
    type: 'mobile',
    category: 'Mobile',
    icon: 'mobile-alt'
  },
  {
    id: 'samsung-s21',
    name: 'Samsung Galaxy S21',
    width: 384,
    height: 854,
    type: 'mobile',
    category: 'Mobile',
    icon: 'mobile-alt'
  },
  {
    id: 'pixel-6',
    name: 'Google Pixel 6',
    width: 411,
    height: 914,
    type: 'mobile',
    category: 'Mobile',
    icon: 'mobile-alt'
  },
  
  // Tablet Devices
  {
    id: 'ipad',
    name: 'iPad',
    width: 768,
    height: 1024,
    type: 'tablet',
    category: 'Tablet',
    icon: 'tablet-alt'
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    type: 'tablet',
    category: 'Tablet',
    icon: 'tablet-alt'
  },
  
  // Desktop Devices
  {
    id: 'macbook-air',
    name: 'MacBook Air',
    width: 1440,
    height: 900,
    type: 'desktop',
    category: 'Desktop',
    icon: 'laptop'
  },
  {
    id: 'desktop',
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    type: 'desktop',
    category: 'Desktop',
    icon: 'desktop'
  },
  {
    id: 'desktop-4k',
    name: 'Desktop 4K',
    width: 3840,
    height: 2160,
    type: 'desktop',
    category: 'Desktop',
    icon: 'desktop'
  }
];

export const getDeviceById = (id: string): Device | undefined => {
  return devices.find(device => device.id === id);
};

export const getDevicesByCategory = () => {
  const categories: Record<string, Device[]> = {};
  
  devices.forEach(device => {
    if (!categories[device.category]) {
      categories[device.category] = [];
    }
    categories[device.category].push(device);
  });
  
  return categories;
};
