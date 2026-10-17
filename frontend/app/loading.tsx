export default function Loading(){
  return <main className="screen-loader premium-loader" aria-label="Loading SKILLSETRA" role="status" aria-live="polite">
    <img className="loading-logo" src="/skillsetra-logo.webp" alt="SKILLSETRA" width={500} height={500} decoding="async" />
    <div className="loader-ring" aria-hidden="true"><span/></div>
    <div className="loader-kicker" aria-hidden="true"><span/> BUILDING YOUR WORKSPACE <span/></div>
  </main>
}
