import { useNavigate } from "react-router-dom"
import { LandingCards } from "./LandingCards"
export const Landing = () => {
    const navigate = useNavigate()
    let landing_cards = [
        {
            title: "Create Study Guides",
            image_url: import.meta.env.VITE_LANDING_V,
            color: "bg-sky-400"
        },
        {
            title: "Browse Flashcards",
            image_url: import.meta.env.VITE_LANDING_I,
            color: "bg-rose-300"
        },
        {
            title: "Import Notes",
            image_url: import.meta.env.VITE_LANDING_II,
            color: "bg-lime-400"
        },
        {
            title: "Collaborate With Friends",
            image_url: import.meta.env.VITE_LANDING_VI,
            color: "bg-orange-400"
        }
    ]
    return (
        <div className="py-10 px-8">
            {/*Top group of text */}
            <div className="w-full flex flex-col items-center gap-4">
                {/*title*/}
                <div className="font-bold text-5xl text-center">
                    Make Studying Fun
                </div>
                {/*Subtitle*/}
                <div className="text-center text-slate-600 text-sm md:text-base w-1/2">
                    Optimize your mode of study with Deckmate's flashcards, study algorithm, and group activities
                </div>
                <button className="hover:cursor-pointer flex px-5 py-3 justify-center items-center bg-sky-700 rounded-3xl text-white text-sm md:text-lg" onClick={() => navigate("/signup")}>
                    Create a free account
                </button>
                <button className="hover:cursor-pointer text-sky-500 font-semibold hover:text-sky-700 text-sm md:text-lg" onClick={() => navigate("/login")}>
                    I already have an account
                </button>
            </div>
            {/*Bottom cards (scrollable?)*/}
            <div className="flex overflow-x-auto p-4 gap-8 mt-10 sm:mt-20 hide-scrollbar">
                {
                    landing_cards.map((landing_card) => (
                        <LandingCards key={landing_card.title} card_title={landing_card.title} image_url={landing_card.image_url} color={landing_card.color} />
                    ))
                }
            </div>
        </div>
    )
}