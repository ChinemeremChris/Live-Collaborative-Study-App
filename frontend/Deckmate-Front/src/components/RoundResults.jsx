import { useRoomProvider } from "../contexts/RoomContext"

export const RoundResults = () => {
    const { currentScores } = useRoomProvider()
    const sorted = [...(currentScores || [])].sort((a, b) => b.score - a.score)
    const bg = ["bg-lime-400", "bg-fuchsia-500", "bg-orange-500", "bg-pink-500"]
    return (
        <div className="flex flex-col p-3 gap-2 md:gap-4 lg:gap-6 w-full min-h-screen bg-linear-to-r from-[#159957] to-[#155799] overflow-y-auto hide-scrollbar text-white">
            <div className="text-4xl font-semibold">
                Leaderboard
            </div>
            <div className="flex flex-col gap-3 md:px-7 lg:px-10">
                <div className="flex text-xl font-semibold justify-between rounded-xl">
                    <span>
                        Player
                    </span>
                    <span>
                        Points
                    </span>
                </div>
                {
                    sorted?.map((scoreObj, index) => (
                        <div key={index} className={`${bg[index % 4]} flex justify-between rounded-lg p-3`}>
                            <span className="font-semibold">
                                {`${scoreObj.name}`}
                            </span>
                            <span>
                                {`${scoreObj.score}`}
                            </span>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}