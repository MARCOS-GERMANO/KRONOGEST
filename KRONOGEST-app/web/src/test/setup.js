import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { supabase } from '../lib/supabase';
afterEach(() => { cleanup(); window.location.hash = ''; supabase.__reset?.(); });
