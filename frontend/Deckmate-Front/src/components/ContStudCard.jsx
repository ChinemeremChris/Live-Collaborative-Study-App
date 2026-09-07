import { Star } from "lucide-react"
import { useNavigate } from "react-router-dom"

export const ContStudCard = ({ card_name, num_cards, rating, cards_due, handleClick }) => {
    const navigate = useNavigate()
    return (
        <div onClick={handleClick} className="hover:cursor-pointer flex flex-col shrink-0 rounded-lg bg-white p-3 w-3/4 sm:w-60 md:w-80 lg:w-90 sm:p-8 gap-2 sm:gap-3">
            {/*title*/}
            <div className="font-semibold text-lg md:text-xl">{card_name}</div>
            {/*subtitle*/}
            <div className="flex gap-5 text-sm md:text-base">
                <div>{`${num_cards} cards`}</div>
                {
                    rating &&
                        <div className="flex items-center">
                            <div>•  {rating}</div>
                            <Star color="white" fill="gold" size={20}/>
                        </div>
                }
            </div>
            <div className="bg-gray-300">
                <div className="bg-blue-600 h-1" style={{width: `${num_cards > 0 ? Math.max(((num_cards-cards_due) / num_cards) * 100, 0) : 0}%`}}/>
            </div>
            <div className="flex justify-between items-center text-sm md:text-base">
                <div className="bg-orange-100 text-yellow-700 py-0.5 px-2 rounded-xl">{`${cards_due} due`}</div>
                <button type="button" onClick={() => navigate(`/study/${deck?.deck_id}`)} className="hover:cursor-pointer rounded-md border-2 border-gray-300 py-1 px-4">Study</button>
            </div>
        </div>
    )
}