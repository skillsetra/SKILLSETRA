import Link from "next/link";

/** Compact footer shown at the bottom of every signed-in page. */
export default function AppFooter(){
 return <footer className="app-footer" aria-label="Site information">
  <div className="app-footer-main"><b>SKILLSETRA</b><span>Know It. Apply It. Prove It.</span></div>
  <nav aria-label="Policies and support"><Link href="/help">Help</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><Link href="/about">About</Link></nav>
  <small>© 2026 SKILLSETRA · AI output should be reviewed before consequential decisions.</small>
 </footer>
}
