import { BookCopy, Clock, Plus, Star, Users } from "lucide-react"
import { CardStackIcon } from "../components/CardStackIcon"
import { CompartNumber } from "../lib/compact"
import { useNavigate } from "react-router-dom"

export const GameDeckCard = ({ deck, HandleDoubleClick }) => {
    const navigate = useNavigate()
    const { deck_id, deck_name, creator_name, card_count, avg_rating, rating_count, created_at } = deck

    return (
        <div onDoubleClick={() => HandleDoubleClick(deck_id)} className="hover:cursor-pointer w-full h-31 md:h-25 flex flex-col gap-1 p-2 border rounded-xl">
            <div className="flex justify-between items-center">
                <div className="flex-1 font-semibold text-xl line-clamp-1 wrap-break-word">
                    {deck_name}
                </div>
                <button onClick={() => HandleDoubleClick(deck_id)} className="ml-1 shrink-0 bg-emerald-400 hover:cursor-pointer rounded-full p-1">
                    <Plus color="white" />
                </button>
            </div>
            <div className="text-sm italic">
                {`by ${creator_name}`}
            </div>
            <div className="flex flex-col md:flex-row gap-1 text-sm text-slate-500">
                <div className="flex items-center gap-1 md:border-r md:border-slate-300 md:w-1/2 md:justify-center">
                    <BookCopy className="w-4 h-4" />
                    <span>
                        {`${card_count} ${card_count !== 1 ? 'cards' : 'card'}`}
                    </span>
                </div>
                <div className="flex items-center gap-1 md:w-1/2 md:justify-center">
                    <Clock className="w-4 h-4" />
                    <span>
                        {`Published ${created_at}`}
                    </span>
                </div>
            </div>
        </div>
    )
}