import { Trophy } from "lucide-react"

export const DashRoom = ({ card_title, room_code, position, room_status }) => {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-1 md:gap-2.5 items-center">
                <div className="flex justify-center items-center bg-sky-600 p-2 rounded-lg">
                    <Trophy size={14} color="white"/>
                </div>
                <div className="flex flex-col">
                    <div className="text-sm font-semibold">{card_title}</div>
                    <div className="flex text-xs text-slate-600 gap-1">
                        <div>{room_code}</div>
                        <div>•</div>
                        <div>Pos: {position}</div>
                    </div>
                </div>
            </div>
            <div className={
                `${room_status === "Active" && 'bg-orange-100 text-yellow-700'}
                 ${room_status === "Completed" && 'bg-green-200 text-green-700'} 
                 ${room_status === "Waiting" && 'bg-red-200 text-red-700'}
                 rounded-xl flex justify-center items-center text-xs p-1`}>
                {room_status}
            </div>
        </div>
    )
}