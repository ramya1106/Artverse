import React from 'react';
import { FILTER_CATEGORIES } from '../../data/artworks';
import {
  FilterBarWrapper,
  FilterInner,
  FilterTab,
} from './styledComponents';

const FilterBar = ({ selectedCategory, onCategoryChange }) => (
  <FilterBarWrapper>
    <FilterInner>
      {FILTER_CATEGORIES.map((cat) => (
        <FilterTab
          key={cat}
          $active={cat === selectedCategory}
          onClick={() => onCategoryChange(cat)}
        >
          {cat}
        </FilterTab>
      ))}
    </FilterInner>
  </FilterBarWrapper>
);

export default FilterBar;
