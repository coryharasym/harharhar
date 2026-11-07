import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Har Har Har — A little friendly competition.',description:'Your after-hours puzzle arcade. Play 2048, chase a personal best, and put your name on the leaderboard.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
