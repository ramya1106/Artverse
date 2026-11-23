import { useState, useEffect, useMemo } from 'react';
import ArtworkCard from '../ArtworkCard';
import PreviewModal from '../PreviewModal';
import useWindowWidth from '../../hooks/useWindowWidth';
import { fetchGallery, fetchGalleryByCategory } from '../../api';
import { ITEMS_PER_PAGE } from '../../data/artworks';
import {
  GalleryWrapper,
  GalleryMasonry,
  EmptyState,
} from './styledComponents';

const LoadingSkeleton = () => {
  const heights = [220, 300, 180, 260, 340, 200, 260, 290, 220, 300, 180, 240];
  return (
    <GalleryMasonry $cols={6}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            background: '#161616',
            marginBottom: '16px',
            borderRadius: '12px',
            maxWidth: '220px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        />
      ))}
    </GalleryMasonry>
  );
};

// Number of masonry columns for the screen width (6 on a laptop)
const getColumnCount = (windowWidth) => {
  if (windowWidth >= 1600)      return 7;
  if (windowWidth >= 1024)      return 6;
  if (windowWidth >= 768)       return 4;
  if (windowWidth >= 480)       return 3;
  return 2;
};

// With adminMode the gallery is the same, but clicking a card opens the admin version of the
// preview modal (stats, edit category, delete) instead of the visitor one.
const Gallery = ({ selectedCategory, currentPage, onTotalChange, adminMode = false }) => {
  const [artworks, setArtworks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const windowWidth = useWindowWidth();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const data = selectedCategory === 'All'
          ? await fetchGallery()
          : await fetchGalleryByCategory(selectedCategory);
        setArtworks(data);
        if (onTotalChange) onTotalChange(data.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // Only reload when the category changes. onTotalChange is left out on purpose so a parent
    // re-render can't trigger another fetch.
  }, [selectedCategory]);

  // Admin edited a category. Update the card in place, or remove it if it no longer belongs
  // to the category being filtered.
  const handleCategoryChange = (updated) => {
    setSelected(updated);
    setArtworks((prev) => {
      const next = selectedCategory !== 'All' && updated.category !== selectedCategory
        ? prev.filter((a) => a._id !== updated._id)
        : prev.map((a) => (a._id === updated._id ? updated : a));
      if (onTotalChange) onTotalChange(next.length);
      return next;
    });
  };

  const handleDeleted = (id) => {
    setArtworks((prev) => {
      const next = prev.filter((a) => a._id !== id);
      if (onTotalChange) onTotalChange(next.length);
      return next;
    });
  };

  // The whole list is fetched once and paged here in the browser
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return artworks.slice(start, start + ITEMS_PER_PAGE);
  }, [artworks, currentPage]);

  const cols = getColumnCount(windowWidth);

  if (loading) return <GalleryWrapper><LoadingSkeleton /></GalleryWrapper>;

  if (error) {
    return (
      <GalleryWrapper>
        <EmptyState>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Failed to load — {error}
        </EmptyState>
      </GalleryWrapper>
    );
  }

  if (pageItems.length === 0) {
    return (
      <GalleryWrapper>
        <EmptyState>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="9" cy="9" r="1.5"/></svg>
          No artworks found
        </EmptyState>
      </GalleryWrapper>
    );
  }

  return (
    <GalleryWrapper>
      <GalleryMasonry $cols={cols}>
        {pageItems.map((artwork) => (
          <ArtworkCard
            key={artwork._id}
            artwork={artwork}
            onSelect={adminMode ? setSelected : undefined}
          />
        ))}
      </GalleryMasonry>
      {adminMode && selected && (
        <PreviewModal
          adminMode
          artwork={selected}
          onClose={() => setSelected(null)}
          onCategoryChange={handleCategoryChange}
          onDeleted={handleDeleted}
        />
      )}
    </GalleryWrapper>
  );
};

export default Gallery;
