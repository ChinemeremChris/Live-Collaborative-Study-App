import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import toast from "react-hot-toast"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/UserContext"
import { PageSpinner } from "../components/PageSpinner"
import { ChevronLeft } from "lucide-react"

export const RoomJoin = () => {
    const {user, userLoading} = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState()

    const HandleBackClick = () => {
        if (location.key === 'default'){
            navigate(`/`, { replace: true })
        }else{
            navigate(-1)
        }
    }

    const HandleSubmit = (e) => {
        e.preventDefault()
        joinMutate()
    }

    const JoinRoom = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${roomCode}/join`, {
            method: "POST",
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
            throw new Error(error.detail || "Error joining room")
        }
        return response.json()
    }

    const {
        mutate: joinMutate,
        isFetching: joinFetching
    } = useMutation({
        mutationFn: JoinRoom,
        onSuccess: (data) => {
            navigate(`/rooms/lobby/${data.room_id}`)
        },
        onError: (error) => {
            toast.error(error.message || "Error joining room")
        }
    })

    return (
        <div className="relative font-montserrat w-screen min-h-screen flex flex-col gap-6 lg:gap-8 justify-center items-center bg-linear-to-t from-sky-700 to-sky-400">
            <button onClick={HandleBackClick} className="hover:cursor-pointer hover:bg-slate-100 hover:text-black text-white rounded-full fixed top-2 left-2 flex items-center p-2 z-20">
                <ChevronLeft />
                <span>Back</span>
            </button>
            <div className="text-white text-5xl lg:text-6xl font-bold">
                DeckMate
            </div>
            <div className="bg-white text-lg lg:text-xl flex flex-col items-center w-5/6 md:w-2/5 lg:w-1/4 rounded-lg py-8 px-6 font-semibold gap-2">
                <div className="lg:text-2xl">
                    Room Code
                </div>
                <form className="flex flex-col gap-3 lg:gap-5" onSubmit={(e) => HandleSubmit(e)}>
                    <input className="w-full border-2 border-slate-400 rounded-md px-6 py-2 lg:py-4 text-center" type="text" placeholder="Enter Room Code" minLength={6} maxLength={6} value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
                    <button type="button" onClick={joinMutate} disabled={joinFetching} className={`${joinFetching ? 'bg-slate-400' : 'bg-slate-700'} w-full rounded-md p-2 lg:p-4 text-white hover:cursor-pointer`}>
                        {`${joinFetching ? 'Joining...' : 'Join'}`}
                    </button>
                </form>
            </div>
        </div>
    )
}