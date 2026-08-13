const CATEGORIES = ['Epic', 'Top', 'Premium', 'Live Wallpapers'];

const HEIGHT_POOL = [260, 340, 200, 300, 380, 220, 280, 320, 250, 360, 290, 240, 310, 270, 350, 410, 190, 330];

export const generateArtworks = (count = 120) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    imageUrl: `https://picsum.photos/seed/${i + 10}/400/${HEIGHT_POOL[i % HEIGHT_POOL.length]}`,
    category: CATEGORIES[i % CATEGORIES.length],
    width: 400,
    height: HEIGHT_POOL[i % HEIGHT_POOL.length],
  }));

export const ARTWORKS = generateArtworks(120);

export const LATEST_DROPS = ARTWORKS.slice(0, 6);

export const FILTER_CATEGORIES = ['All', 'Epic', 'Top', 'Premium', 'Live Wallpapers'];

export const ITEMS_PER_PAGE = 12;
