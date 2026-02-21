import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import History from '../pages/History';
import { AnalysisProvider } from '../context/AnalysisContext';

test('filters job table by search input', async () => {
  const user = userEvent.setup();
  render(
    <AnalysisProvider initialLoading={false}>
      <History />
    </AnalysisProvider>
  );
  const input = screen.getByLabelText('Search jobs');
  await user.type(input, 'alloy');
  expect(await screen.findByText(/alloy-batch-21/i)).toBeInTheDocument();
});
