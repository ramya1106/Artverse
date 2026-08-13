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

// Fallback images used when DB is empty (during early development)
const FALLBACK_SEEDS = [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];

// Repeats an array until it has at least `minLength` items.
// This is what prevents the gap — we fill the column with enough
// repeated images that it's always taller than the viewport.
const fillToLength = (arr, minLength) => {
  if (arr.length === 0) return arr;
  const result = [];
  while (result.length < minLength) {
    result.push(...arr);
  }
  return result;
};

// Single image tile
const ScrollTile = React.memo(({ src, ratio }) => {
  const handleLoad = useCallback((e) => {
    e.target.classList.add('loaded');
    const ph = e.target.previousSibling;
    if (ph) ph.style.opacity = '0';
  }, []);

  return (
    <ScrollImageWrapper>
      {/* aspect-ratio on placeholder matches the real image — no layout jump */}
      <ScrollPlaceholder $ratio={ratio} />
      <ScrollImage
        src={src}
        alt=""
        loading="lazy"
        onLoad={handleLoad}
        style={{
          aspectRatio: ratio,
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
        crossOrigin="anonymous"  // needed for blob download to work on cached images
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
    const MIN_TILES = 20; // guarantees no gap for any screen height

    let baseTiles;

    if (gallery.length > 0) {
      // Stagger which images each column starts with
      // so the three columns don't all show the same image at the same time
      const offset = colIndex * Math.ceil(gallery.length / 3);
      const rotated = [
        ...gallery.slice(offset),
        ...gallery.slice(0, offset),
      ];

      baseTiles = rotated.map((art) => ({
        src: art.imageURL,
        // Use the real aspect ratio stored in MongoDB
        // e.g. 400×600 image → ratio = "400 / 600"
        ratio: art.width && art.height
          ? `${art.width} / ${art.height}`
          : '3 / 4',  // fallback portrait
      }));
    } else {
      // Empty DB — use picsum with portrait aspect ratio
      baseTiles = FALLBACK_SEEDS.map((seed, i) => ({
        src: `https://picsum.photos/seed/${seed + colIndex * 7}/400/600`,
        ratio: '2 / 3',
      }));
    }

    // Fill to MIN_TILES then duplicate for seamless loop
    const filled = fillToLength(baseTiles, MIN_TILES);
    return [...filled, ...filled]; // duplication = seamless animation loop
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
