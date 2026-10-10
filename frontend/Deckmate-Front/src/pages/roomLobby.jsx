import { useEffect, useRef, useState } from "react"
import { useAuth } from "../contexts/UserContext"
import { PageSpinner } from "../components/PageSpinner"
import { Check, Clipboard, Copy, LogOut, Play, Users } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import toast from "react-hot-toast"
import { useRoomProvider } from "../contexts/RoomContext"

export const RoomLobby = () => {
    const {user, userLoading} = useAuth()
    const {roomInfo, roomInfoFetching, isErrorRoomInfo, roomInfoError, isLeaving, SendMessage, closeWS} = useRoomProvider()
    const { room_id } = useParams()
    // const ws = useRef(null)
    // const isLeaving = useRef(false)
    const [isCopied, setIsCopied] = useState(false)
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()

    const HandleCopy = async (code) => {
        try{
            await navigator.clipboard.writeText(code)
            setIsCopied(true)

            setTimeout(() => {
                setIsCopied(false)
            }, 2000);
        }catch(e){
            toast.error("Failed to copy code: ", e)
        }
    }

    const HandleStartGame = () => {
        SendMessage("start")
    }

    //commented
    // const GetRoomInfo = async () => {
    //     const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/info/${room_id}`, {
    //         method: "GET",
    //         credentials: "include",
    //         headers: {
    //             "Content-Type": "application/json"
    //         }
    //     })
    //     if (!response.ok){
    //         const error = await response.json()
    //         if (response.status === 422){
    //             const message = error.detail.map(e => e.msg).join(', ')
    //             throw new Error(message || "Error with input")
    //         }
    //         throw new Error(error.detail || "Error fetching room info")
    //     }
    //     return response.json()
    // }

    const LeaveRoom = async () => {
        isLeaving.current = true
        const url = user?.id === roomInfo?.host_id ? `${import.meta.env.VITE_API_URL}/rooms/${room_id}` : `${import.meta.env.VITE_API_URL}/rooms/participants/${room_id}`
        const response = await fetch(url, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(', ')
                throw new Error(message || "Error with input")
            }
            throw new Error(error.detail || "Error leaving room")
        }
        return response.json()
    }
    
    //comment
    // const {
    //     data: roomInfo,
    //     isFetching: roomInfoFetching,
    //     isError: isErrorRoomInfo,
    //     error: roomInfoError
    // } = useQuery({
    //     queryKey: ["rooms", room_id],
    //     queryFn: GetRoomInfo,
    //     staleTime: 1000 * 60 * 10,
    //     gcTime: 1000 * 60 * 10
    // })

    const {
        mutate: leaveMutate,
        isPending: leavePending
    } = useMutation({
        mutationFn: LeaveRoom,
        onError: (error) => {
            toast.error(error.message || "Error leaving room")
        },
        onSuccess: () => {
            closeWS(1000)
            if(location.key === "default"){
                navigate('/')
            }else{
                navigate(-1)
            }
        }
    })

    useEffect(() => {
        if(isErrorRoomInfo){
            toast.error(roomInfoError?.message)
        }
    }, [isErrorRoomInfo, roomInfoError])

    // useEffect(() => {
    //     if ((!roomInfoFetching && !roomInfo) || roomInfo?.room_status === "Completed"){
    //         toast("Room lobby is unavailable")
    //         navigate("/")
    //     }
    // }, [roomInfo])

    //commented
    // useEffect(() => {
    //     if (!roomInfo?.room_code) return
    //     ws.current = new WebSocket(`${import.meta.env.VITE_WS_URL}/rooms/${roomInfo?.room_code}/ws`)

    //     ws.current.onopen = () => {
    //         console.log("open")
    //     }

    //     ws.current.onmessage = (event) => {
    //         const data = JSON.parse(event.data)
    //         switch(data.type){
    //             case 'player_join':
    //                 queryClient.invalidateQueries(["rooms", room_id])
    //                 toast.success(data.message)
    //                 break
    //             case 'player_leave':
    //                 queryClient.invalidateQueries(["rooms", room_id])
    //                 toast(data.message)
    //                 break
    //             case 'end_room':
    //                 toast("Room has been closed by host")
    //                 navigate("/")
    //                 break
    //             case 'error':
    //                 toast.error(data.message)
    //                 break
    //             case 'start_game':
    //                 navigate(`/rooms/game/${room_id}`, { replace: true })
    //                 break
    //             default:
    //                 toast(data.message)
    //                 break
    //         }
    //     }

    //     ws.current.onerror = (error) => {
    //         console.log("Websocker error: ", error)
    //     }

    //     ws.current.onclose = (event) => {
    //         if (!event.wasClean && !isLeaving.current){
    //             toast.error("Disconnected from room")
    //             navigate("/")
    //         }
    //         if (user?.id === roomInfo?.host_id){
    //             console.log("ended")
    //         }
    //     }

    //     return () => {
    //         ws.current.close()
    //     }
    // }, [roomInfo?.room_code])

    return (
        <div className="flex flex-col gap-4 w-screen min-h-screen bg-linear-to-t from-purple-700 to-purple-400 p-3">
            <div className="flex justify-end gap-5 shrink-0 text-white min-w-0">
                <div className="flex items-center p-2 gap-1">
                    <Users />
                    <span>
                        {roomInfo?.participants?.length}
                    </span>
                </div>
                <button disabled={leavePending} type="button" onClick={() => leaveMutate()} className={`${leavePending ? 'bg-red-300' : 'bg-red-500'} hover:cursor-pointer flex items-center gap-1 px-4 py-2 rounded-lg`}>
                    <LogOut />
                    <span>
                        {leavePending ? 'Leaving...' : 'Leave Room'}
                    </span>
                </button>
            </div>
            <div className="flex flex-col justify-between flex-1">
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between md:px-20 lg:px-2">
                    <div className="flex flex-col lg:w-3/5 gap-5">
                        {/* room code container */}
                        <div className="bg-white flex flex-col rounded-lg items-center gap-3 p-2 md:py-6 text-black">
                            <div className="text-2xl md:text-3xl font-semibold">
                                ROOM CODE
                            </div>
                            <div className="hover:cursor-text tracking-widest text-5xl md:text-6xl p-3 font-bold">
                                {roomInfo?.room_code}
                            </div>
                            {
                                isCopied ?
                                    <button className="flex items-center gap-1">
                                        <Check color="green" />
                                        <span>Copied</span>
                                    </button>
                                :
                                    <button type="button" onClick={() => HandleCopy(roomInfo?.room_code)} className="hover:cursor-pointer flex items-center gap-1">
                                        <Copy />
                                        <span>Copy Room Code</span>
                                    </button>
                            }
                            
                        </div>
                        {/* host container */}
                        {
                            roomInfo?.host_id === user?.id &&
                                <div className="flex flex-col gap-2 p-4 md:p-7 bg-white rounded-lg">
                                    <div className="text-xl md:text-2xl font-semibold">
                                        Game Configuration
                                    </div>
                                    <div className="flex flex-col gap-1 md:text-lg">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-600">
                                                Deck
                                            </span>
                                            <span className="font-semibold">
                                                {roomInfo?.deck_name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-600">
                                                Questions
                                            </span>
                                            <span className="font-semibold">
                                                {roomInfo?.num_questions}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-600">
                                                Time per question
                                            </span>
                                            <span className="font-semibold">
                                                {`${roomInfo?.interval}s`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                        }
                        
                    </div>
                    {/* player container */}
                    <div className="bg-white flex flex-col lg:w-2/5 p-4 gap-2 rounded-lg">
                        <div className="flex justify-between">
                            <span className="font-semibold md:text-lg">
                                Players
                            </span>
                            <div className="flex items-center gap-1">
                                <div className="animate-pulse w-3 h-3 bg-emerald-600 rounded-full" />
                                <span>
                                    {`${roomInfo?.participants?.length} ${roomInfo?.participants?.length === 1 ? 'player' : 'players'}`}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
                            {
                                roomInfo?.participants?.map((player) => (
                                    <div key={player.id} className={`${player.id === user?.id && 'bg-purple-500 text-white'} hide-scrollbar p-2 rounded-lg relative flex items-center gap-2 hover:cursor-pointer`}>
                                        {
                                            roomInfo?.host_id === player.id &&
                                                <div className="absolute right-2 bg-sky-700 py-1 px-3 rounded-2xl text-sm text-white">
                                                    Host
                                                </div>
                                        }
                                        <div className={`w-10 h-10 bg-sky-300 text-white font-semibold flex justify-center items-center p-2 rounded-full`}>
                                            {`${player.name.split(" ")[0][0]?.toUpperCase()}${player.name.split(" ")[1][0].toUpperCase()}`}
                                        </div>
                                        <div className="line-clamp-1">
                                            {player.name}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
                <div className="flex min-w-0 justify-center md:px-20 md:text-xl lg:text-3xl">
                    {
                        roomInfo?.host_id === user?.id ?
                        //or maybe send date with type start in websocket?
                            <button type="button" onClick={HandleStartGame} className="hover:cursor-pointer lg:w-120 md:py-3 lg:py-5 bg-sky-700 rounded-xl w-full flex justify-center items-center gap-2 p-2 font-semibold text-white">
                                <Play className="md:w-6 md:h-6 lg:w-8 lg:h-8" fill="white" />
                                <span>
                                    Start Game
                                </span>
                            </button>
                        :   
                            <div className="hover:cursor-not-allowed lg:w-120 md:py-3 lg:py-5 bg-white rounded-xl w-full justify-center flex items-center gap-2 p-2 font-semibold text-gray-400">
                                <div className="w-3 h-3 rounded-full animate-pulse bg-amber-500" />
                                <div>
                                    Waiting for host to start...
                                </div>
                            </div>
                    }
                </div>
            </div>
        </div>
    )
}