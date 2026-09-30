import { Layers } from "lucide-react"

export const DashSession = ({ card_title, session_date, num_cards_studied }) => {
    return (
        <div className="flex gap-1 md:gap-2.5 items-center">
            <div className="flex justify-center items-center bg-sky-600 p-2 rounded-lg">
                <Layers size={14} color="white"/>
            </div>
            <div className="flex flex-col">
                <div className="text-sm font-semibold">{card_title}</div>
                <div className="flex text-xs text-slate-600 gap-1">
                    <div>{session_date}</div>
                    <div>•</div>
                    <div>{`${num_cards_studied} ${num_cards_studied === 1 ? 'card' : 'cards'}`}</div>
                </div>
            </div>
        </div>
    )
}