import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Check, Gamepad, Gamepad2, GamepadDirectional, Scale, Trophy } from "lucide-react"
import { useAuth } from "../contexts/UserContext"
import { useEffect } from "react"
import toast from "react-hot-toast"
import { PageSpinner } from "../components/PageSpinner"
import { useNavigate } from "react-router-dom"

export const RoomHistory = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const positionUI = ['bg-amber-100 text-amber-600', 'bg-slate-100 text-slate-600', 'bg-brown-100 text-brown-600']
    const gridUI = {
        'Completed': 'bg-emerald-100 text-emerald-500',
        'Active': 'bg-red-100 text-red-500',
        'Waiting': 'bg-slate-100 text-slate-500'
    }

    const CorrectOrdinal = (n) => {
        if (n == 0 || n === null) return '—'
        const unit = Number(n) % 10
        switch (unit){
            case 1:
                return `${n}st`
            case 2:
                return `${n}nd`
            case 3:
                return `${n}rd`
            default:
                return `${n}st`
            
        }
    }

    const RoomStats = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/stats`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error fetching room stats")
        }
        return response.json()
    }

    const GetPastRooms = async (pageParam) => {
        const params = new URLSearchParams()
        params.append('limit', 5)
        if (pageParam) params.append('cursor', pageParam)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/participants/me?${params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error fetching past rooms")
        }
        return response.json()
    }

    const {
        data: rooms,
        isLoading: roomLoading,
        isError: isRoomError,
        error: roomError
    } = useQuery({
        queryKey: ["roomStats", user?.id],
        queryFn: RoomStats,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 30
    })

    const {
        data: pastRooms,
        isPending, pastRoomsPending,
        isFetchingNextPage: pastRoomsFetchingNextPage,
        isError: isPastRoomsError,
        error: pastRoomsError,
        fetchNextPage,
        hasNextPage
    } = useInfiniteQuery({
        queryKey: ["pastRooms", user?.id],
        queryFn: ({ pageParam }) => GetPastRooms(pageParam),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.next_cursor ?? null
    })

    useEffect(() => {
        if (isRoomError){
            toast.error(roomError.message || "Error fetching room stats")
        }
    }, [isRoomError, roomError])

    useEffect(() => {
        if (isPastRoomsError){
            toast.error(pastRoomsError.message || "Error fetching past rooms")
        }
    }, [isPastRoomsError, pastRoomsError])

    return (
        <div className="flex flex-col gap-4 w-full min-h-screen bg-linear-to-r from-[#6190E8] to-[#A7BFE8] p-3 md:px-15 lg:px-18 md:py-4">
            <div className="flex flex-col lg:gap-2">
                <span className="flex flex-col font-bold text-4xl md:text-5xl lg:text-6xl text-white">
                    Room History
                </span>
                <span className="text-sm lg:text-xl text-white">
                    View your past live game sessions, scores, and participants
                </span>
            </div>
            {
                roomLoading ?
                    <div className="w-full h-70 md:h-88 lg:h-104 animate-pulse bg-slate-400" />
                :
                    <div className="bg-white flex flex-col rounded-xl p-3 md:p-5 lg:p-8 gap-2 md:gap-5">
                        <span className="font-semibold text-2xl md:text-3xl">
                            Game Stats
                        </span>
                        <div className="flex flex-col gap-4 lg:gap-6 font-semibold">
                            <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
                                <div className="flex w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 justify-center items-center bg-violet-100 rounded-full">
                                    <Gamepad2 className="md:w-8 md:h-8 lg:w-10 lg:h-10" fill="violet" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-sm md:text-base lg:text-lg">
                                        Total Rooms Played
                                    </span>
                                    {/* replace with real data */}
                                    <span className="md:text-lg lg:text-xl">
                                        {`${rooms?.rooms_played}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
                                <div className="flex w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 justify-center items-center text-blue-500 bg-blue-100 rounded-full">
                                    <Scale className="md:w-8 md:h-8 lg:w-10 lg:h-10" fill="blue" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-sm md:text-base lg:text-lg">
                                        Rooms Hosted
                                    </span>
                                    {/* replace with real data */}
                                    <span className="md:text-lg lg:text-xl">
                                        {`${rooms?.rooms_hosted}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
                                <div className="flex w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 justify-center items-center text-amber-400 bg-amber-100 rounded-full">
                                    <Trophy className="md:w-8 md:h-8 lg:w-10 lg:h-10" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-sm md:text-base lg:text-lg">
                                        Best Position
                                    </span>
                                    {/* replace with real data */}
                                    <span className="md:text-lg lg:text-xl">
                                        {`${CorrectOrdinal(rooms?.best_position)}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 lg:gap-8">
                                <div className="flex w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 justify-center items-center text-emerald-500 bg-emerald-100 rounded-full">
                                    <Check className="md:w-8 md:h-8 lg:w-10 lg:h-10" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-sm md:text-base lg:text-lg">
                                        Accuracy
                                    </span>
                                    {/* replace with real data */}
                                    <span className="md:text-lg lg:text-xl">
                                        {`${rooms?.accuracy !== null ? `${rooms?.accuracy}%` : '—'}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
            }
            <div className="md:hidden bg-white flex flex-col rounded-xl p-3 gap-3">
                <span className="font-semibold text-2xl">
                    Recent Rooms
                </span>
                <div className="grid grid-cols-[auto_3fr_1fr] items-center gap-y-5">
                    {
                        pastRoomsPending ? 
                            <div>
                                <PageSpinner message="Loading past rooms" />
                            </div>
                        :
                            pastRooms?.pages?.flatMap((page) => (
                                page?.room_list?.map((room) => (
                                    <div key={room.room_id} onClick={() => navigate(`/rooms/results/${room.room_id}`)} className="hover:cursor-pointer contents">
                                        <div className="flex w-6 h-6 rounded-lg text-purple-600 bg-purple-200 justify-center items-center shrink-0">
                                            <GamepadDirectional className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0 px-2">
                                            <span className="font-semibold line-clamp-1">
                                                {room.deck_name}
                                            </span>
                                            <span className="text-xs italic">
                                                {new Date(room.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col shrink-0">
                                            <span className={`flex justify-center font-semibold text-sm rounded-sm py-0.5 ${(Number(room.placement?.split('/', 1)[0]) > 0 && Number(room.placement?.split('/', 1)[0] < 4)) && positionUI[Number(room.placement?.split('/', 1)[0]) - 1]}`}>
                                                {`${room.placement?.split('/', 1)[0] ? CorrectOrdinal(room.placement?.split('/', 1)[0]) : '—'}`}
                                            </span>
                                            <span className="text-xs">
                                                {`Score: ${room.score !== null ? room.score : '—'}`}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ))
                    }
                </div>
            </div>
            <div className="hidden md:bg-white md:flex md:flex-col md:rounded-xl md:p-3 md:gap-3">
                <span className="font-semibold text-2xl">
                    Recent Rooms
                </span>
                <div className="grid grid-cols-[1fr_2fr_2fr_1fr_0.5fr_1fr] gap-y-6 gap-x-6 lg:text-lg">
                    <span className="font-semibold">Date</span>
                    <span className="font-semibold">Deck</span>
                    <span className="font-semibold">Host</span>
                    <span className="font-semibold">Status</span>
                    <span className="font-semibold">Score</span>
                    <span className="font-semibold">Position</span>
                    {
                        pastRoomsPending ? 
                            <div>
                                <PageSpinner message="Loading past rooms" />
                            </div>
                        :
                            pastRooms?.pages?.flatMap((page) => (
                                page?.room_list?.map((room) => (
                                    <div key={room.room_id} onClick={() => navigate(`/rooms/results/${room.room_id}`)} className="hover:cursor-pointer contents">
                                        <div className="flex flex-col italic">
                                            <span className="text-sm lg:text-base">
                                                {new Date(room.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(room.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="line-clamp-2 font-semibold">
                                            {room.deck_name}
                                        </div>
                                        <div className="line-clamp-2">
                                            {room.hosted_by}
                                        </div>
                                        <div className={`${gridUI[room.room_status]} flex justify-center items-center rounded-xl p-1 text-sm font-semibold`}>
                                            {room.room_status}
                                        </div>
                                        <div>
                                            {room.score ?? '—'}
                                        </div>
                                        <div className={`${room.placement?.split('/')[0] ? positionUI[room.placement?.split('/')[0] - 1] : ''} flex justify-center items-center rounded-xl p-1 text-sm font-semibold`}>
                                            {room.placement}
                                        </div>
                                    </div>
                                ))
                            ))
                    }
                </div>
            </div>
            <div className="flex justify-center">
                <button type="button" onClick={() => fetchNextPage()} disabled={!hasNextPage || pastRoomsFetchingNextPage} className={`flex justify-center items-center w-1/2 lg:w-1/3 p-2 md:p-3 text-white text-lg md:text-2xl font-semibold rounded-lg ${(!hasNextPage || pastRoomsFetchingNextPage) ? 'hover:cursor-not-allowed bg-purple-300' : 'hover:cursor-pointer bg-linear-to-r from-[#6a3093] to-[#a044ff]'}`}>
                    {`${pastRoomsFetchingNextPage ? 'Loading...' : (hasNextPage ? 'Load More' : 'No more sessions')}`}
                </button>
            </div>
        </div>
    )
}