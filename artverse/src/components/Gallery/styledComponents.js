import styled from 'styled-components';

export const GalleryWrapper = styled.div`
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.black};
  position: relative;
  z-index: 1;
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 1rem 0.75rem 3rem;
  }
`;

export const GalleryMasonry = styled.div`
  columns: ${({ $cols }) => $cols || 4};
  column-gap: 16px;
  /* No max-width here, ArtworkCard limits its own width */
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  gap: 1rem;

  svg {
    width: 40px;
    height: 40px;
    stroke: ${({ theme }) => theme.colors.textDim};
    fill: none;
    stroke-width: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;
