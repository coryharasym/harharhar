'use client';
import {useEffect} from 'react';
export function AppInstall(){
 useEffect(()=>{
  if(!window.isSecureContext||!('serviceWorker' in navigator))return;
  const base=location.pathname.startsWith('/harharhar/')?'/harharhar/':'/';
  // Wait until the app is usable. Updates activate after existing app windows close.
  let cancelled=false;
  const register=()=>{if(!cancelled)void navigator.serviceWorker.register(base+'sw.js',{scope:base,updateViaCache:'none'}).catch(()=>{});};
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
  return()=>{cancelled=true;window.removeEventListener('load',register);};
 },[]);
 return null;
}
