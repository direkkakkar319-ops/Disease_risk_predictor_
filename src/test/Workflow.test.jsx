import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import Upload from '../components/Upload';
import { AnalysisProvider } from '../context/AnalysisContext';

test('completes upload workflow and updates status', async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(1);
  render(
    <AnalysisProvider initialLoading={false}>
      <Upload />
    </AnalysisProvider>
  );
  const input = screen.getByLabelText('Upload material files');
  const file = new File(['data'], 'material.csv', { type: 'text/csv' });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByText('Start Upload'));
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  Math.random.mockRestore();
  vi.useRealTimers();
});
