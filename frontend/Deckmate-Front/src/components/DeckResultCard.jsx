import { BookCopy, Star, Users } from "lucide-react"
import { CardStackIcon } from "../components/CardStackIcon"
import { CompartNumber } from "../lib/compact"
import { useNavigate } from "react-router-dom"

export const DeckResultCard = ({ deck }) => {
    const navigate = useNavigate()
    const {deck_id, deck_name, creator_name, card_count, avg_rating, rating_count} = deck

    return (
        <div className={`flex flex-col w-11/12 h-52 gap-3 border border-slate-100 rounded-2xl shadow-lg hover:cursor-pointer transition-transform ease-in-out duration-200 hover:scale-105`} onClick={() => navigate(`/decks/${deck_id}`)}>
            {/* top */}
            <div className="flex p-4">
                {/* mini-thumbnail, title, creator */}
                <div className="flex gap-4">
                    {/* thumbnail */}
                    <div className="bg-indigo-300 text-indigo-400 w-12 h-12 rounded-4xl flex fhrink-0 justify-center items-center">
                        <CardStackIcon className="w-7 h-7" />
                    </div>
                    {/* title & author */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <div className="text-2xl font-semibold line-clamp-2" title={deck_name}>{deck_name}</div>
                        <div className="flex text-base text-slate-500 gap-1">
                            <div>by</div>
                            <div className="text-black font-semibold min-w-0 line-clamp-1">{creator_name}</div>
                        </div>
                    </div>
                </div>
                {/* rating section */}
            </div>
            {/* bottom */}
            <div className="grid grid-cols-3 px-2">
                <div className="flex justify-center gap-1 border-r border-slate-200 px-2 mb-4 min-w-0">
                    <div>
                        <BookCopy className="text-indigo-400 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-semibold shrink-0">{CompartNumber(card_count)}</div>
                        <div className="text-xs text-slate-500">cards</div>
                    </div>
                </div>
                <div className="flex justify-center gap-1 border-r border-slate-200 px-2 mb-4 min-w-0">
                    <div className="text-amber-400">
                        <Star className="shrink-0"/>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-semibold">{avg_rating ? avg_rating: '—'}</div>
                        <div className="text-xs text-slate-500">average rating</div>
                    </div>
                </div>
                <div className="flex justify-center gap-1 px-2 mb-4 min-w-0">
                    <div className="text-slate-700">
                        <Users className="shrink-0" fill="#db03fc"/>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-semibold">{CompartNumber(rating_count)}</div>
                        <div className="text-xs text-slate-500">rating(s)</div>
                    </div>
                </div>
            </div>
        </div>
    )
}