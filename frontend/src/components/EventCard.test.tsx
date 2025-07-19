import { render, screen } from '@testing-library/react';
import EventCard from './EventCard';
import { describe, it, expect } from 'vitest';

describe('EventCard', () => {
  it('renders banner and title', () => {
    const event = {
      id: 1,
      title: 'Test Event',
      banner_url: 'https://example.com/banner.png',
    } as any;

    render(<EventCard event={event} onParticipate={() => {}} />);

    const img = screen.getByRole('img', { name: /test event/i });
    expect(img).toBeInTheDocument();
    const heading = screen.getByText(/test event/i);
    expect(heading).toBeInTheDocument();
  });
});