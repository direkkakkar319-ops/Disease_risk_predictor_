import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Upload from '../components/Upload';
import { AnalysisProvider } from '../context/AnalysisContext';

test('shows validation error for unsupported file type', async () => {
  const user = userEvent.setup();
  render(
    <AnalysisProvider initialLoading={false}>
      <Upload />
    </AnalysisProvider>
  );
  const input = screen.getByLabelText('Upload material files');
  const file = new File(['hello'], 'sample.png', { type: 'image/png' });
  await user.upload(input, file);
  await user.click(screen.getByText('Start Upload'));
  expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
});
