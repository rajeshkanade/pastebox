import { toast } from 'react-toastify';



import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import Signup from './Signup';
// Mock functions
const mockDispatch = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-redux', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn((fn) => fn({ auth: { loading: false, error: null } })),
  };
});

vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import configureMockStore from 'redux-mock-store';
const mockStore = configureMockStore([]);

describe('Signup Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({ auth: { loading: false, error: null } });
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockDispatch.mockResolvedValue({ error: false });
  });

  test('renders signup form', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Signup />
        </BrowserRouter>
      </Provider>
    );
    expect(screen.getByPlaceholderText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign up for Paste Box/i)).toBeInTheDocument();
  });

  test('enter valid details, submit, and redirect to login', async () => {
    mockDispatch.mockResolvedValue({ error: false });
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Signup />
        </BrowserRouter>
      </Provider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('shows error message for invalid signup', async () => {
    mockDispatch.mockResolvedValue({
      error: true,
      payload: 'Email already exists',
    });
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Signup />
        </BrowserRouter>
      </Provider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email already exists');
    });
  });
});
