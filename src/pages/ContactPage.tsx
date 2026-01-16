
import { Mail, MessageSquare } from 'lucide-react'

export function ContactPage() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8 text-gray-300">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-500/20 rounded-xl border border-violet-500/30">
                    <Mail className="w-8 h-8 text-violet-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Contactez-nous</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-[#1a1430] rounded-2xl border border-white/5 space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-cyan-400" />
                        Par Email
                    </h2>
                    <p className="text-sm text-gray-400">
                        Pour toute question relative à votre compte ou aux tournois.
                    </p>
                    <a href="mailto:kwatapowa@gmail.com" className="block w-full text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                        kwatapowa@gmail.com
                    </a>
                </div>

                <div className="p-6 bg-[#1a1430] rounded-2xl border border-white/5 space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-violet-400" />
                        Sur Discord
                    </h2>
                    <p className="text-sm text-gray-400">
                        Rejoignez notre communauté pour discuter et obtenir de l'aide en direct.
                    </p>
                    <a href="#" className="block w-full text-center py-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#5865F2] border border-[#5865F2]/50 rounded-lg transition-colors">
                        Rejoindre le Discord
                    </a>
                </div>
            </div>
        </div>
    )
}
