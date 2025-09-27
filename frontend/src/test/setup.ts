import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('import.meta', () => ({ env: { VITE_API_URL: 'http://localhost:8000' } }));
