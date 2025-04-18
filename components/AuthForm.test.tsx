jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signUp: jest.fn(() => Promise.resolve({ error: null })),
    },
  }),
}));

import React from 'react';
import '@testing-library/jest-dom';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from './AuthForm';

describe('AuthForm', () => {
  it('renders login/register form', () => {
    render(<AuthForm />);
    expect(screen.getByText(/Login or Register/i)).toBeInTheDocument();
  });

  it('can type email and password', () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password' } });
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('password')).toBeInTheDocument();
  });

  it('shows success message on sign in', async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByText(/Sign In/i));
    await waitFor(() => expect(screen.getByText(/Signed in/i)).toBeInTheDocument());
  });
});
