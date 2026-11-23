import React, { useState, useEffect, useCallback } from 'react';
import { fetchGallery } from '../../api';
import {
  HeroSection,
  HeroLeft,
  HeroEyebrow,
  HeroTitle,
  HeroBody,
  HeroActions,
  PrimaryButton,
  GhostButton,
  HeroRight,
  ScrollColumn,
  ScrollImageWrapper,
  ScrollPlaceholder,
  ScrollImage,
} from './styledComponents';

const COLUMN_CONFIG = [
  { duration: 30, offset: 0 },
  { duration: 24, offset: -40 },
  { duration: 38, offset: -80 },
];

// Placeholder photos shown only when the gallery has no images yet
const FALLBACK_SEEDS = [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];

// Repeats the images until there are at least minLength of them, so the column
// is always taller than the screen and never shows a gap.
const fillToLength = (arr, minLength) => {
  if (arr.length === 0) return arr;
  const result = [];
  while (result.length < minLength) {
    result.push(...arr);
  }
  return result;
};

const ScrollTile = React.memo(({ src, ratio }) => {
  const handleLoad = useCallback((e) => {
    e.target.classList.add('loaded');
    const ph = e.target.previousSibling;
    if (ph) ph.style.opacity = '0';
  }, []);

  return (
    <ScrollImageWrapper>
      {/* the placeholder uses the real aspect ratio, so nothing jumps when the image loads */}
      <ScrollPlaceholder $ratio={ratio} />
      <ScrollImage
        src={src}
        alt=""
        loading="lazy"
        onLoad={handleLoad}
        crossOrigin="anonymous"
      />
    </ScrollImageWrapper>
  );
});

ScrollTile.displayName = 'ScrollTile';

const Hero = ({ onExplore, onInstagram }) => {
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchGallery();
        const imagesOnly = data.filter(artwork => artwork.mediaType !== 'video');
        setGallery(imagesOnly);
      } catch {
        setGallery([]);
      }
    };
    load();
  }, []);


  const buildColumn = (colIndex) => {
    const MIN_TILES = 20; // enough tiles that no screen height shows a gap

    let baseTiles;

    if (gallery.length > 0) {
      // Each column starts at a different image so all three don't show the same one
      const offset = colIndex * Math.ceil(gallery.length / 3);
      const rotated = [
        ...gallery.slice(offset),
        ...gallery.slice(0, offset),
      ];

      baseTiles = rotated.map((art) => ({
        src: art.imageURL,
        // width and height are saved at upload time, e.g. "400 / 600"
        ratio: art.width && art.height
          ? `${art.width} / ${art.height}`
          : '3 / 4', // older records may not have them
      }));
    } else {
      // Nothing uploaded yet, so show placeholder photos
      baseTiles = FALLBACK_SEEDS.map((seed) => ({
        src: `https://picsum.photos/seed/${seed + colIndex * 7}/400/600`,
        ratio: '2 / 3',
      }));
    }

    const filled = fillToLength(baseTiles, MIN_TILES);
    // The list is doubled because the CSS animation scrolls up by half its height, then repeats
    return [...filled, ...filled];
  };

  return (
    <HeroSection>
      <HeroLeft>
        <HeroEyebrow>Premium Digital Art</HeroEyebrow>
        <HeroTitle>
          Curated art,
          <strong>Uncompromised.</strong>
        </HeroTitle>
        <HeroBody>
          Discover and download premium artworks from emerging and established
          creators. Each piece crafted for those who demand excellence.
        </HeroBody>
        <HeroActions>
          <PrimaryButton onClick={onExplore}>Explore Gallery</PrimaryButton>
          <GhostButton   onClick={onInstagram}>Instagram</GhostButton>
        </HeroActions>
      </HeroLeft>

      <HeroRight>
        {COLUMN_CONFIG.map((col, colIndex) => (
          <ScrollColumn
            key={colIndex}
            $duration={col.duration}
            $offset={col.offset}
          >
            {buildColumn(colIndex).map((tile, i) => (
              <ScrollTile key={i} src={tile.src} ratio={tile.ratio} />
            ))}
          </ScrollColumn>
        ))}
      </HeroRight>
    </HeroSection>
  );
};

export default Hero;
