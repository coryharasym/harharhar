import {build} from 'vite';
import {cp,rm,writeFile} from 'node:fs/promises';
await build({configFile:'vite.pages.config.ts'});
// Publish tracked HTML/CSS/JS at the repository root for the existing main/root Pages setup.
await rm('assets',{recursive:true,force:true});
await cp('pages-dist/assets','assets',{recursive:true});
await cp('pages-dist/index.html','index.html');
await cp('pages-dist/favicon.svg','favicon.svg');
await writeFile('.nojekyll','');
console.log('GitHub Pages files are ready at the repository root.');
