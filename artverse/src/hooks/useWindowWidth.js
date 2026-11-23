import { useState, useEffect } from 'react';

// Current window width, updated on resize. Used to pick the masonry column count in JS.
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
};

export default useWindowWidth;
