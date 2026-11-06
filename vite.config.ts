import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// Vite 6 (version locked in package-lock): stable extra entry for HtmlService.
export default defineConfig({base:'./',plugins:[react(),tailwindcss()],build:{target:'es2022',rollupOptions:{input:{main:resolve(__dirname,'index.html'),tutor:resolve(__dirname,'src/tutor-entry.tsx')},output:{entryFileNames:chunk=>chunk.name==='tutor'?'tutor.js':'assets/[name]-[hash].js'}}},server:{host:'127.0.0.1'}});
