import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders navigation and home page header', () => {
  render(<App initialLoading={false} />);
  expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
});
