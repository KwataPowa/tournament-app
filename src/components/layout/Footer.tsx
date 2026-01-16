
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="w-full bg-[#0a0512] border-t border-white/5 pt-12 pb-6 mt-20">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-violet-400" />
                            <span className="text-lg font-bold text-white">Tournastic</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            La plateforme ultime pour organiser et rejoindre des tournois eSport.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Navigation</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/" className="hover:text-violet-400 transition-colors">Accueil</Link></li>
                            <li><Link to="/tournaments" className="hover:text-violet-400 transition-colors">Tournois</Link></li>
                            <li><Link to="/contact" className="hover:text-violet-400 transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Légal</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/legal/mentions-legales" className="hover:text-violet-400 transition-colors">Mentions Légales</Link></li>
                            <li><Link to="/legal/politique-confidentialite" className="hover:text-violet-400 transition-colors">Politique de Confidentialité</Link></li>
                            <li><Link to="/legal/cgu" className="hover:text-violet-400 transition-colors">CGU</Link></li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Réseaux</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-violet-400 transition-colors">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-violet-400 transition-colors">Discord</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
                    <p>© {currentYear} Tournastic. Tous droits réservés.</p>
                    <div className="flex items-center gap-6">
                        <span>Fait avec 💜</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
