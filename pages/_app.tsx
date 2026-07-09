import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

function NavLink({href,children}:{href:string;children:React.ReactNode}){
  const r=useRouter();
  const a=r.pathname===href;
  return <Link href={href} className={`px-3 py-2 rounded-md text-sm font-medium transition ${a?'bg-amber-700 text-white':'text-amber-100 hover:bg-amber-700 hover:text-white'}`}>{children}</Link>;
}

export default function App({Component,pageProps}:AppProps){
  return <>
    <Head><title>DirtBid AI</title><meta name="viewport" content="width=device-width,initial-scale=1"/></Head>
    <div className="min-h-screen flex flex-col">
      <header className="bg-amber-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-amber-100 font-bold text-xl">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/></svg>
              DirtBid AI
            </Link>
            <nav className="flex gap-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/calculator">Calculator</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Component {...pageProps} />
      </main>
      <footer className="bg-white border-t py-4 text-center text-sm text-gray-500">DirtBid AI v0.1</footer>
    </div>
  </>;
}
