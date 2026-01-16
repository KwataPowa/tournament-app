
import { Shield } from 'lucide-react'

export function PrivacyPolicy() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8 text-gray-300">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
                    <Shield className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Politique de Confidentialité</h1>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">1. Collecte des données</h2>
                <p>
                    Nous collectons les données suivantes lors de votre utilisation du service :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Informations de compte (email, pseudo, avatar) via Supabase Auth.</li>
                    <li>Données de participation aux tournois et pronostics.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">2. Utilisation des données</h2>
                <p>
                    Vos données sont utilisées uniquement pour :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Gérer votre compte et vos accès.</li>
                    <li>Permettre le bon fonctionnement des tournois et classements.</li>
                    <li>Vous contacter en cas de nécessité technique.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">3. Vos droits</h2>
                <p>
                    Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ce droit, veuillez nous contacter via la page de contact.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">4. Cookies</h2>
                <p>
                    Nous utilisons des cookies essentiels au fonctionnement de l'authentification. Aucune donnée n'est revendue à des tiers.
                </p>
            </section>
        </div>
    )
}
