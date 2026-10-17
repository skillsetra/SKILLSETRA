import Link from "next/link";

export default function Logo({compact=false}:{compact?:boolean}){
  return <Link href="/" className={`skillsetra-logo ${compact?"compact":""}`} aria-label="SKILLSETRA home">
    <img src="/skillsetra-logo.webp" alt="SKILLSETRA — Learn, Build, Prove, Grow" width={500} height={500} decoding="async" />
  </Link>;
}
