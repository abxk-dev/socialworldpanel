import React from 'react';
import CustomPageWrapper from './CustomPageWrapper';
import SocialProofPage from './SocialProofPage';

// Try to load custom HTML page with slug "proof".
// If not found, fall back to the existing SocialProofPage React layout.
const ProofDynamicPage = () => (
  <CustomPageWrapper slug="proof" fallback={SocialProofPage} />
);

export default ProofDynamicPage;

