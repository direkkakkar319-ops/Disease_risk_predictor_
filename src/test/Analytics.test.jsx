import React from 'react';
import { render, screen } from '@testing-library/react';
import Analytics from '../pages/Analytics';
import { AnalysisProvider } from '../context/AnalysisContext';

test('renders analytics sections', () => {
  render(
    <AnalysisProvider initialLoading={false}>
      <Analytics />
    </AnalysisProvider>
  );
  expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
  expect(screen.getByText('Success Rate')).toBeInTheDocument();
  expect(screen.getByText('Processing Time')).toBeInTheDocument();
  expect(screen.getByText('File Type Distribution')).toBeInTheDocument();
});
