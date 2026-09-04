import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: { email: 'alex@example.com' } }),
}));

vi.mock('@/features/auth/hooks/useAuthMutations', () => ({
  useLogout: () => mocks.logout,
}));

afterEach(() => {
  cleanup();
  mocks.logout.mockReset();
});

describe('navigation architecture', () => {
  it('groups desktop destinations without removing feature routes from the app', () => {
    render(<MemoryRouter><DesktopSidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Daily Nutrition' })).toHaveAttribute('href', '/daily-tracker');
    expect(screen.getByRole('link', { name: 'Meals & Logs' })).toHaveAttribute('href', '/meals');
    expect(screen.getByRole('link', { name: 'Recipes' })).toHaveAttribute('href', '/recipes');
    expect(screen.getByRole('link', { name: 'Food Catalog' })).toHaveAttribute('href', '/foods');
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Health Profile' })).toHaveAttribute('href', '/health');
    expect(screen.getByRole('link', { name: 'Laboratory' })).toHaveAttribute('href', '/laboratory');
    expect(screen.getByRole('link', { name: 'Nutrition Trends' })).toHaveAttribute('href', '/trends');
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nutrition Consultation' })).toHaveAttribute('href', '/consultation');
    expect(screen.queryByRole('link', { name: 'Meal Planner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recommendations' })).not.toBeInTheDocument();
  });

  it('provides four mobile destinations and a keyboard-accessible action sheet', () => {
    render(<MemoryRouter initialEntries={['/daily-tracker']}><MobileBottomNav /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Nutrition' })).toHaveAttribute('href', '/daily-tracker');
    expect(screen.getByRole('link', { name: 'Health' })).toHaveAttribute('href', '/health');
    expect(screen.getByRole('link', { name: 'AI' })).toHaveAttribute('href', '/consultation');
    expect(screen.getByRole('button', { name: /log food, scan food/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('More')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /log food, scan food/i }));

    expect(screen.getByRole('dialog', { name: 'What would you like to log?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Food/ })).toHaveAttribute('href', '/daily-tracker');
    expect(screen.getByRole('link', { name: /Scan Food/ })).toHaveAttribute('href', '/food-recognition');
    expect(screen.getByRole('link', { name: /Create Recipe/ })).toHaveAttribute('href', '/recipes');
    expect(screen.getByRole('link', { name: /Log Meal/ })).toHaveAttribute('href', '/meals');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'What would you like to log?' })).not.toBeInTheDocument();
  });
});
