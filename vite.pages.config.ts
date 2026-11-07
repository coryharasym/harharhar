import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./web',import.meta.url));
export default defineConfig({root,base:'/harharhar/',publicDir:'../public',plugins:[react()],build:{outDir:'../pages-dist',emptyOutDir:true}});
