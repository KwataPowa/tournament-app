
import { Scale } from 'lucide-react'

export function LegalNotice() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8 text-gray-300">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
                    <Scale className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Mentions Légales</h1>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">1. Éditeur du site</h2>
                <p>
                    Le site <strong>Tournastic</strong> est édité par :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Propriétaire :</strong> Miguel GERVILLA</li>
                    <li><strong>Adresse :</strong> 12 rue du 23 Novembre, 67540 OSTWALD</li>
                    <li><strong>Téléphone :</strong> 06 13 83 41 06</li>
                    <li><strong>Email :</strong> <a href="mailto:kwatapowa@gmail.com" className="hover:text-violet-400 transition-colors">kwatapowa@gmail.com</a></li>
                    <li><strong>Directeur de la publication :</strong> Miguel GERVILLA</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">2. Hébergement</h2>
                <p>
                    Le site est hébergé par :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Hébergeur :</strong> Vercel Inc.</li>
                    <li><strong>Adresse :</strong> 340 S Lemon Ave #4133 Walnut, CA 91789</li>
                    <li><strong>Téléphone :</strong> (559) 288-7060</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">3. Propriété intellectuelle</h2>
                <p>
                    L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                </p>
            </section>
        </div>
    )
}
