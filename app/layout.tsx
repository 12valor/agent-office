import './globals.css';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-office',
  display: 'swap',
});

export const metadata = {
  title: 'Agent Office',
  description: 'Local Codex activity monitor',
};

export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="en" className={poppins.variable}><body>{children}</body></html>;
}
