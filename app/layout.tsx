import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Har Har Har — A little friendly competition.',description:'Your midnight arcade. Play 2048, Block Flux and Neon Dodger.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'HarHarHar',statusBarStyle:'black-translucent'},icons:{icon:'/favicon.svg',apple:'/icons/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0c1022'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><head><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="HarHarHar"/><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/></head><body>{children}</body></html>}
