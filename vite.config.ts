import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
// Relative assets work at /, /repository/ and on other static HTTPS hosts.
export default defineConfig({base:'./',plugins:[react(),tailwindcss()],build:{target:'es2022'},server:{host:'127.0.0.1'}});
