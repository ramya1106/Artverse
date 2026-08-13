import React, { useState, useEffect } from 'react';
import ArtworkCard from '../ArtworkCard';
import { fetchLatest } from '../../api';
import {
  DropsSection,
  SectionHeader,
  SectionTitleGroup,
  SectionEyebrow,
  SectionTitle,
  SectionSub,
  MasonryGrid,
} from './styledComponents';

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
};

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
        <SectionTitleGroup>
          <SectionEyebrow>Just Arrived</SectionEyebrow>
          <SectionTitle>Latest Drops</SectionTitle>
        </SectionTitleGroup>
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
