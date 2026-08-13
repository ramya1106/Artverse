import styled from 'styled-components';

export const DropsSection = styled.section`
  padding: 5rem 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3rem 1rem;
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 3rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const SectionTitleGroup = styled.div``;

export const SectionEyebrow = styled.span`
  display: block;
  font-size: 0.58rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.red};
  margin-bottom: 0.6rem;
`;

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.serif};
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 300;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text};
`;

export const SectionSub = styled.span`
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const MasonryGrid = styled.div`
  columns: ${({ $cols }) => $cols || 4};
  column-gap: 16px;
`;
