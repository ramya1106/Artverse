import { useState, useCallback } from 'react';
import Hero        from '../../components/Hero';
import StatsBar    from '../../components/StatsBar';
import LatestDrops from '../../components/LatestDrops';
import FilterBar   from '../../components/FilterBar';
import Gallery     from '../../components/Gallery';
import Pagination  from '../../components/Pagination';
import {
  PageWrapper,
  Navbar, NavLogo, NavLinks, NavLink, NavCta,
  StatsDivider,
  GalleryAnchor,
  PageFooter,
  FooterTop, FooterBrand, FooterLogo, FooterTagline,
  SocialRow, SocialLink,
  FooterCol, FooterColTitle, FooterLinks, FooterLinkItem,
  FooterBottom, FooterCopy, FooterLegal,
} from './styledComponents';

// Smooth scroll to a section. The offset is the height of the fixed navbar.
const scrollTo = (id, offset = 56) => {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
};

const INSTAGRAM_URL = 'https://www.instagram.com/a.rt._.verse/';
const TWITTER_URL   = 'https://x.com/art_verse_ai';
const KOFI_URL      = 'https://ko-fi.com/artverse03';

// Social media icons
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Ko-fi has no standard logo file, so a coffee cup is used
const KofiIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 010 8h-1"/>
    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/>
    <line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
);

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage,      setCurrentPage]      = useState(1);
  const [totalArtworks,    setTotalArtworks]    = useState(0);

  // Changing the category always goes back to page 1
  const handleCategoryChange = useCallback((cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }, []);

  return (
    <PageWrapper>

      {/* Navbar */}
      <Navbar>
        <NavLogo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ART<span>V</span>ERSE
        </NavLogo>
        <NavLinks>
          <NavLink as="button" onClick={() => scrollTo('gallery-section')}>Gallery</NavLink>
          <NavLink as="button" onClick={() => scrollTo('latest-drops')}>Drops</NavLink>
          <NavLink as="button" onClick={() => scrollTo('site-footer')}>About</NavLink>
          <NavCta href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            Instagram
          </NavCta>
        </NavLinks>
      </Navbar>

      {/* Hero */}
      <Hero
        onExplore={() => scrollTo('gallery-section')}
        onInstagram={() => window.open(INSTAGRAM_URL, '_blank')}
      />

      <StatsDivider />

      {/* Stats */}
      <StatsBar />

      {/* Latest drops */}
      <div id="latest-drops">
        <LatestDrops />
      </div>

      {/* Gallery */}
      <GalleryAnchor id="filterbar-anchor" />
      <div id="gallery-section">
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <Gallery
          selectedCategory={selectedCategory}
          currentPage={currentPage}
          onTotalChange={setTotalArtworks}
        />
      </div>

      <Pagination
        totalItems={totalArtworks}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Footer */}
      <PageFooter id="site-footer">
        <FooterTop>

          {/* Brand column */}
          <FooterBrand>
            <FooterLogo>ART<span>V</span>ERSE</FooterLogo>
            <FooterTagline>
              Premium digital art for those who demand excellence.
              Curated from emerging and established creators worldwide.
            </FooterTagline>
            <SocialRow>
              <SocialLink href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" title="Instagram">
                <InstagramIcon />
              </SocialLink>
              <SocialLink href={TWITTER_URL} target="_blank" rel="noopener noreferrer" title="X / Twitter">
                <XIcon />
              </SocialLink>
              <SocialLink href="https://youtube.com" target="_blank" rel="noopener noreferrer" title="YouTube">
                <YoutubeIcon />
              </SocialLink>
              <SocialLink href={KOFI_URL} target="_blank" rel="noopener noreferrer" title="Support on Ko-fi">
                <KofiIcon />
              </SocialLink>
            </SocialRow>
          </FooterBrand>

          {/* Explore column */}
          <FooterCol>
            <FooterColTitle>Explore</FooterColTitle>
            <FooterLinks>
              <FooterLinkItem>
                <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('gallery-section'); }}>Gallery</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('latest-drops'); }}>Latest Drops</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('gallery-section'); }}>Epic</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('gallery-section'); }}>Premium</a>
              </FooterLinkItem>
            </FooterLinks>
          </FooterCol>

          {/* Connect column */}
          <FooterCol>
            <FooterColTitle>Connect</FooterColTitle>
            <FooterLinks>
              <FooterLinkItem>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer">X / Twitter</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
              </FooterLinkItem>
              <FooterLinkItem>
                <a href={KOFI_URL} target="_blank" rel="noopener noreferrer">Support on Ko-fi ☕</a>
              </FooterLinkItem>
            </FooterLinks>
          </FooterCol>

        </FooterTop>

        <FooterBottom>
          <FooterCopy>© 2026 Artverse. All rights reserved.</FooterCopy>
          <FooterLegal>Images are property of their respective creators.</FooterLegal>
        </FooterBottom>
      </PageFooter>

    </PageWrapper>
  );
};

export default Home;
