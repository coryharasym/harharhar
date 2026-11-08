import {preparePwa} from './prepare-pwa.mjs';
import {build} from 'vite';
import {cp,rm,writeFile} from 'node:fs/promises';
await build({configFile:'vite.pages.config.ts'});
await preparePwa('pages-dist');
// Publish tracked HTML/CSS/JS at the repository root for the existing main/root Pages setup.
await rm('assets',{recursive:true,force:true});
await cp('pages-dist/assets','assets',{recursive:true});
await cp('pages-dist/index.html','index.html');
await cp('pages-dist/favicon.svg','favicon.svg');
await rm('maple-art',{recursive:true,force:true});
for(const file of ['manifest.webmanifest','sw.js','precache.json','icons','neon-dodger-preview.webp','maple-art'])await cp('pages-dist/'+file,file,{recursive:true});
await writeFile('.nojekyll','');
console.log('GitHub Pages files are ready at the repository root.');
