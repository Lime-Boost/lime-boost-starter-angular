import { Buffer } from 'buffer';

(window as unknown as Record<string, unknown>)['global'] = window;
(window as unknown as Record<string, unknown>)['Buffer'] = Buffer;
