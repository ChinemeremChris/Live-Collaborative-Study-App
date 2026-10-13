import { Layers } from "lucide-react"

export const DashSession = ({ card_title, session_date, num_cards_studied }) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; 
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        dateStyle: "short",
        timeStyle: "short"
    })

    return (
        <div className="flex gap-1 md:gap-2.5 items-center">
            <div className="flex justify-center items-center bg-sky-600 p-2 rounded-lg">
                <Layers size={14} color="white"/>
            </div>
            <div className="flex flex-col">
                <div className="text-sm font-semibold">{card_title}</div>
                <div className="flex text-xs text-slate-600 gap-1">
                    <div>
                        {
                            formatter.format(new Date(session_date))
                        }
                    </div>
                    <div>•</div>
                    <div>{`${num_cards_studied} ${num_cards_studied === 1 ? 'card' : 'cards'}`}</div>
                </div>
            </div>
        </div>
    )
}