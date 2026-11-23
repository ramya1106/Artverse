import { useState, useEffect } from 'react';
import ArtworkCard from '../ArtworkCard';
import useWindowWidth from '../../hooks/useWindowWidth';
import { fetchLatest } from '../../api';
import {
  DropsSection,
  SectionHeader,
  SectionEyebrow,
  SectionTitle,
  SectionSub,
  MasonryGrid,
} from './styledComponents';

const getColumnCount = (windowWidth) => {
  if (windowWidth >= 1024) return 6;
  if (windowWidth >= 768)  return 4;
  if (windowWidth >= 480)  return 3;
  return 2;
};

const LatestDrops = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const windowWidth = useWindowWidth();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchLatest();
        setArtworks(data);
      } catch (err) {
        console.error('Latest drops failed:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || artworks.length === 0) return null;

  const cols = getColumnCount(windowWidth);

  return (
    <DropsSection>
      <SectionHeader>
        <div>
          <SectionEyebrow>Just Arrived</SectionEyebrow>
          <SectionTitle>Latest Drops</SectionTitle>
        </div>
        <SectionSub>Fresh work weekly</SectionSub>
      </SectionHeader>

      <MasonryGrid $cols={cols}>
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork._id} artwork={artwork} />
        ))}
      </MasonryGrid>
    </DropsSection>
  );
};

export default LatestDrops;
