
import { FileText } from 'lucide-react'

export function TermsOfService() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8 text-gray-300">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
                    <FileText className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Conditions Générales d'Utilisation</h1>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">1. Acceptation des conditions</h2>
                <p>
                    L'accès et l'utilisation du site <strong>Tournastic</strong> impliquent l'acceptation sans réserve des présentes Conditions Générales d'Utilisation.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">2. Accès au site</h2>
                <p>
                    Le site est accessible gratuitement à tout utilisateur disposant d'un accès à internet. Tous les coûts afférents à l'accès au site sont à la charge de l'utilisateur.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">3. Comportement</h2>
                <p>
                    L'utilisateur s'engage à ne pas tenir de propos injurieux, diffamatoires ou racistes dans les espaces de discussion ou les noms d'équipes/joueurs. Nous nous réservons le droit de supprimer tout contenu inapproprié.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">4. Responsabilité</h2>
                <p>
                    Nous ne saurions être tenus responsables des éventuels dysfonctionnements du réseau ou des serveurs.
                </p>
            </section>
        </div>
    )
}
