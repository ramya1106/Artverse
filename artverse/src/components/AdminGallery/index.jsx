// Admin gallery. It uses the same FilterBar, Gallery and Pagination as the
// public site, with Gallery switched into adminMode.
import { useState, useCallback, useEffect } from 'react';
import FilterBar from '../FilterBar';
import Gallery from '../Gallery';
import Pagination from '../Pagination';
import { ITEMS_PER_PAGE } from '../../data/artworks';

const AdminGallery = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArtworks, setTotalArtworks] = useState(0);

  const handleCategoryChange = useCallback((cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }, []);

  // After deletes, don't stay on a page that no longer exists
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(totalArtworks / ITEMS_PER_PAGE));
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [totalArtworks, currentPage]);

  return (
    <div>
      <FilterBar selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
      <Gallery
        adminMode
        selectedCategory={selectedCategory}
        currentPage={currentPage}
        onTotalChange={setTotalArtworks}
      />
      <Pagination
        totalItems={totalArtworks}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default AdminGallery;
