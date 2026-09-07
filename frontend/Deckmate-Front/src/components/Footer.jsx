export const Footer = () => {
    return (
        <div className="w-full h-full bottom-0 sm:h-30 flex flex-col justify-center sm:items-center gap-2 p-3 bg-sky-700 text-white">
            <div className="text-sm sm:text-base">Copyright © 2026 DeckMate. All rights reserved.</div>
            <div className="flex gap-4 sm:gap-10 text-sm sm:text-base">
                <div>•  Policy</div>
                <div>•  Terms of Service</div>
                <div>•  Github</div>
            </div>
        </div>
    )
}