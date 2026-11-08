import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export async function preparePwa(directory){
 const assets=await readdir(directory,{recursive:true});
 const paths=['./','neon-dodger-preview.webp','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png','favicon.svg',...assets.filter(name=>(name.startsWith('assets/')||name.startsWith('_next/static/'))&&/\.(?:js|css|woff2?|png|svg|webp)$/.test(name))].sort();
 // Include artwork bytes so replacing the image also refreshes installed offline apps.
 const artwork=await readFile(path.join(directory,'neon-dodger-preview.webp'));
 const revision=createHash('sha256').update(paths.join('\n')).update(artwork).digest('hex').slice(0,16);
 await writeFile(path.join(directory,'precache.json'),JSON.stringify(paths));
 const worker=await readFile('public/sw.js','utf8');
 await writeFile(path.join(directory,'sw.js'),worker.replace('__BUILD_VERSION__',revision));
}
