import { User } from 'lucide-react'
import { AVATAR_MAP } from './AvatarPicker'

type AvatarDisplayProps = {
    avatar: string | null | undefined
    className?: string
    fallbackText?: string
}

export function AvatarDisplay({ avatar, className = "w-6 h-6", fallbackText }: AvatarDisplayProps) {
    // 1. Check if it's a known icon ID
    if (avatar && AVATAR_MAP[avatar]) {
        const Icon = AVATAR_MAP[avatar]
        return <Icon className={className} />
    }

    // 2. Check if it's a URL (simple check)
    if (avatar && (avatar.startsWith('http') || avatar.startsWith('/'))) {
        return <img src={avatar} alt="Avatar" className={`object-cover rounded-full ${className}`} />
    }

    // 3. Fallback: Render as text (emoji or initials)
    // If no avatar, use fallbackText (initials) or just default User icon
    if (!avatar) {
        if (fallbackText) {
            return (
                <span className={`flex items-center justify-center font-bold ${className}`}>
                    {fallbackText}
                </span>
            )
        }
        return <User className={className} />
    }

    // It's likely an emoji or unknown string
    return (
        <span className={`flex items-center justify-center leading-none ${className}`}>
            {avatar}
        </span>
    )
}
