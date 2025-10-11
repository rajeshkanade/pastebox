


import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { toast } from 'react-toastify';
import configureStore from 'redux-mock-store';

const mockDispatch = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-redux', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn(fn => fn({ auth: { loading: false, error: null } })),
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

const mockStore = configureStore([]);

describe('Login Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({ auth: { loading: false, error: null } });
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockDispatch.mockResolvedValue({ error: false });
  });

  test('renders login form', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Login to Paste Box/i)).toBeInTheDocument();
  });

  test('enter valid email and password, submit, and redirect to dashboard', async () => {
    mockDispatch.mockResolvedValue({ error: false });
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error message for invalid login', async () => {
    mockDispatch.mockResolvedValue({ error: true, payload: 'Invalid Credentials' });
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid Credentials');
    });
  });
});
