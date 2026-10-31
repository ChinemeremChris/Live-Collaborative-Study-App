import { BookCopy, LockKeyholeOpen, Star, Users } from "lucide-react"
import { CardStackIcon } from "../components/CardStackIcon"
import { CompartNumber } from "../lib/compact"
import { useNavigate } from "react-router-dom"

export const MyDeckCard = ({ deck }) => {
    const navigate = useNavigate()
    const { deck_id, deck_name, card_count, avg_rating, rating_count, is_public } = deck

    return (
        <div onClick={() => navigate(`/decks/${deck_id}`)} className="hover:cursor-pointer bg-white w-11/12 h-35 flex flex-col gap-2 py-2.5 px-5 rounded-xl shadow-lg">
            <div className="flex flex-col gap-1 border-b border-slate-300 flex-1">
                <div className="font-semibold text-lg line-clamp-2">
                    {deck_name}
                </div>
                {
                    is_public ?
                        <div className="flex items-center gap-1 bg-emerald-100 text-green-700 text-xs px-3 py-1 rounded-xl w-fit">
                            <LockKeyholeOpen className="w-3 h-3" />
                            <span>Public</span>
                        </div>
                    :
                        <div className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-3 py-1 rounded-xl w-fit">
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                        </div>
                }
            </div>
            <div className="flex items-center gap-3 shrink-0 text-sm">
                <div className="flex items-center gap-0.5">
                    <CardStackIcon className="w-4 h-4" />
                    <span>
                        {card_count}
                    </span>
                </div>
                <div className="flex items-center gap-0.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <div className="flex items-center gap-0.5">
                        <span>
                            {avg_rating ?? '—'}
                        </span>
                        <span>
                            {rating_count ? `(${rating_count})` : ''}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    )
}