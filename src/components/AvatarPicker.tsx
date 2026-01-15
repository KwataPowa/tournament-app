import type { LucideIcon } from 'lucide-react'
import {
    // Gaming / Esport
    User,
    Ghost,
    Gamepad2,
    Swords,
    Trophy,
    Target,
    Zap,
    Crown,
    Skull,
    Rocket,
    Flame,
    Cat,
    // Animals
    Dog,
    Bird,
    Fish,
    Bug,
    Rabbit,
    Snail,
    Squirrel,
    Turtle,
    // Heroes / Action
    Shield,
    Sword,
    Wand2,
    Crosshair,
    Bomb,
    Axe,
    // Nature / Space
    Moon,
    Sun,
    Star,
    Sparkles,
    Cloud,
    Snowflake,
    // Fun / Misc
    Heart,
    Music,
    Pizza,
    Coffee,
    Glasses,
    Laugh,
    PartyPopper,
    Gem
} from 'lucide-react'

// Avatar categories with icons
export const AVATAR_CATEGORIES = [
    {
        id: 'gaming',
        label: '🎮 Gaming',
        avatars: [
            { id: 'user', icon: User, label: 'Joueur' },
            { id: 'ghost', icon: Ghost, label: 'Fantôme' },
            { id: 'gamepad', icon: Gamepad2, label: 'Manette' },
            { id: 'trophy', icon: Trophy, label: 'Trophée' },
            { id: 'target', icon: Target, label: 'Cible' },
            { id: 'zap', icon: Zap, label: 'Éclair' },
            { id: 'crown', icon: Crown, label: 'Couronne' },
            { id: 'skull', icon: Skull, label: 'Crâne' },
            { id: 'rocket', icon: Rocket, label: 'Fusée' },
            { id: 'flame', icon: Flame, label: 'Flamme' },
        ]
    },
    {
        id: 'animals',
        label: '🐾 Animaux',
        avatars: [
            { id: 'cat', icon: Cat, label: 'Chat' },
            { id: 'dog', icon: Dog, label: 'Chien' },
            { id: 'bird', icon: Bird, label: 'Oiseau' },
            { id: 'fish', icon: Fish, label: 'Poisson' },
            { id: 'bug', icon: Bug, label: 'Insecte' },
            { id: 'rabbit', icon: Rabbit, label: 'Lapin' },
            { id: 'snail', icon: Snail, label: 'Escargot' },
            { id: 'squirrel', icon: Squirrel, label: 'Écureuil' },
            { id: 'turtle', icon: Turtle, label: 'Tortue' },
        ]
    },
    {
        id: 'heroes',
        label: '⚔️ Combat',
        avatars: [
            { id: 'swords', icon: Swords, label: 'Épées' },
            { id: 'shield', icon: Shield, label: 'Bouclier' },
            { id: 'sword', icon: Sword, label: 'Épée' },
            { id: 'wand', icon: Wand2, label: 'Baguette' },
            { id: 'crosshair', icon: Crosshair, label: 'Viseur' },
            { id: 'bomb', icon: Bomb, label: 'Bombe' },
            { id: 'axe', icon: Axe, label: 'Hache' },
        ]
    },
    {
        id: 'space',
        label: '✨ Cosmos',
        avatars: [
            { id: 'moon', icon: Moon, label: 'Lune' },
            { id: 'sun', icon: Sun, label: 'Soleil' },
            { id: 'star', icon: Star, label: 'Étoile' },
            { id: 'sparkles', icon: Sparkles, label: 'Étincelles' },
            { id: 'cloud', icon: Cloud, label: 'Nuage' },
            { id: 'snowflake', icon: Snowflake, label: 'Flocon' },
        ]
    },
    {
        id: 'fun',
        label: '🎉 Fun',
        avatars: [
            { id: 'heart', icon: Heart, label: 'Cœur' },
            { id: 'music', icon: Music, label: 'Musique' },
            { id: 'pizza', icon: Pizza, label: 'Pizza' },
            { id: 'coffee', icon: Coffee, label: 'Café' },
            { id: 'glasses', icon: Glasses, label: 'Lunettes' },
            { id: 'laugh', icon: Laugh, label: 'Rire' },
            { id: 'party', icon: PartyPopper, label: 'Fête' },
            { id: 'gem', icon: Gem, label: 'Gemme' },
        ]
    },
]

// Flat map for looking up avatars by ID
export const AVATAR_MAP: Record<string, LucideIcon> = {}
AVATAR_CATEGORIES.forEach(cat => {
    cat.avatars.forEach(av => {
        AVATAR_MAP[av.id] = av.icon
    })
})

// Get all avatars as a flat list (for backwards compatibility)
export const ALL_AVATARS = AVATAR_CATEGORIES.flatMap(cat => cat.avatars)

type AvatarPickerProps = {
    selected: string
    onSelect: (id: string) => void
    compact?: boolean
}

export function AvatarPicker({ selected, onSelect, compact = false }: AvatarPickerProps) {
    return (
        <div className="space-y-3">
            {/* Scrollable Grid Container */}
            <div className="bg-black/20 rounded-xl p-3 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                <div className={`grid ${compact ? 'grid-cols-6' : 'grid-cols-5 sm:grid-cols-6'} gap-2`}>
                    {ALL_AVATARS.map((avatar) => {
                        const Icon = avatar.icon
                        const isSelected = selected === avatar.id
                        return (
                            <button
                                key={avatar.id}
                                type="button"
                                onClick={() => onSelect(avatar.id)}
                                title={avatar.label}
                                className={`
                  aspect-square rounded-xl flex items-center justify-center
                  transition-all duration-200 border-2
                  ${isSelected
                                        ? 'bg-violet-500/20 border-violet-500 ring-2 ring-violet-400/50 shadow-lg shadow-violet-500/20 scale-105 z-10'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                                    }
                `}
                            >
                                <Icon className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${isSelected ? 'text-violet-300' : 'text-gray-400'}`} />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Selected indicator */}
            {!compact && (
                <p className="text-xs text-gray-500 text-center h-4">
                    <span className="text-violet-400 font-medium transition-all">
                        {ALL_AVATARS.find(a => a.id === selected)?.label || selected}
                    </span>
                </p>
            )}
        </div>
    )
}
