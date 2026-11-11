'use client';
import {useEffect} from 'react';
export function AppInstall(){
 useEffect(()=>{
  if(!window.isSecureContext||!('serviceWorker' in navigator))return;
  const base=location.pathname.startsWith('/harharhar/')?'/harharhar/':'/';
  // Development CSS has stable URLs; an old offline cache must not shadow edits.
  if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){
   void navigator.serviceWorker.getRegistration(base).then(registration=>{if(registration?.scope===new URL(base,location.origin).href&&registration.active?.scriptURL===new URL(base+'sw.js',location.origin).href)void registration.unregister();}).catch(()=>{});
   return;
  }
  // Wait until the app is usable. Updates activate after existing app windows close.
  let cancelled=false;
  const register=()=>{if(!cancelled)void navigator.serviceWorker.register(base+'sw.js',{scope:base,updateViaCache:'none'}).catch(()=>{});};
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
  return()=>{cancelled=true;window.removeEventListener('load',register);};
 },[]);
 return null;
}
