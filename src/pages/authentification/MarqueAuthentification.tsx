import logoSecuritec from '@/assets/logo securitec.jpg';

export default function MarqueAuthentification() {
  return (
    <aside className="auth-brand">
      <div className="flex items-center gap-3">
        <img src={logoSecuritec} alt="SECURITEC Surveillance" className="h-14 w-12 rounded-md object-contain" />
        <div>
          <p className="text-xl font-bold">SECURITEC</p>
          <p className="text-xs text-login-muted">Digitalisation du poste de garde</p>
        </div>
      </div>
      <div className="auth-brand-copy">
        <p className="mb-4 font-mono text-xs text-login-accent">SECURITEC — SITE PILOTE</p>
        <h2 className="max-w-sm text-4xl font-semibold leading-tight">Le registre du poste de garde, sans papier.</h2>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-login-muted">Vacations, visiteurs, véhicules, badges NFC, rondes, caméras et main courante.</p>
      </div>
      <div>
        <p className="mb-3 font-mono text-[10px] text-login-muted">AUTHENTIFICATION SÉCURISÉE</p>
      </div>
    </aside>
  );
}
