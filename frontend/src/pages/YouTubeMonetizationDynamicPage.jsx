import React from 'react';
import CustomPageWrapper from './CustomPageWrapper';
import YouTubeMonetizationPage from './YouTubeMonetizationPage';

// Try to load custom HTML page with slug "youtube-monetization".
// If not found, fall back to the existing React landing page.
const YouTubeMonetizationDynamicPage = () => (
  <CustomPageWrapper slug="youtube-monetization" fallback={YouTubeMonetizationPage} />
);

export default YouTubeMonetizationDynamicPage;

