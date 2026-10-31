import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/UserContext"
import { useEffect } from "react"
import toast from "react-hot-toast"
import { CardStackIcon } from "../components/CardStackIcon"
import { BookOpen, Gamepad2, Layers, Plus, Star } from "lucide-react"
import { MyDeckCard } from "../components/MyDeckCard"

//make sure to invalidate my-decks cache when user creates or update deck
export const MyPages = () => {
    const { user } = useAuth()
    const navigate = useNavigate()

    const GetMyDecks = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/me`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 401){
                navigate('/login')
            }else if (response.status === 422){
                const message = error.detail.map((e) => e.msg).join(', ')
                throw new Error (message || "Error with input")
            }
            throw new Error (error.detail || error.message || "Error fetching user's decks")
        }
        return response.json()
    }

    const {
        data: myDecks,
        isLoading: myDecksLoading,
        isError: isMyDecksError,
        error: myDecksError
    } = useQuery({
        queryKey: ["my-decks", user?.id],
        queryFn: GetMyDecks,
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 30
    })

    useEffect(() => {
        if (!isMyDecksError) return
        toast.error(myDecksError.message)
    }, [isMyDecksError, myDecksError])

    return (
        <div className="bg-slate-50 w-full min-h-screen flex flex-col p-2 md:px-8 md:py-4 lg:px-15 gap-3">
            <div className="font-bold text-3xl text-slate-600">
                Stats
            </div>
            {
                myDecksLoading ?
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                        <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                        <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                        <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                    </div>
                :
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-x-10 lg:gap-x-5 md:gap-y-4">
                        <div className="flex rounded-lg p-3 lg:p-6 gap-2 font-semibold bg-white shadow-md">
                            <div className="bg-sky-200 p-1.5 h-fit rounded-full">
                                <Layers className="w-5 h-5 lg:w-7 lg:h-7 text-white" fill="white" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm md:text-base lg:text-lg text-slate-600">
                                    Decks
                                </span>
                                <span className="text-xl md:text-2xl">
                                    {myDecks?.num_decks}
                                </span>
                                <span className="text-xs md:text-sm text-slate-400">
                                    {`total ${myDecks?.num_decks !== 1 ? 'decks' : 'deck'}`}
                                </span>
                            </div>
                        </div>
                        <div className="flex rounded-lg p-3 lg:p-6 gap-2 font-semibold bg-white shadow-md">
                            <div className="bg-amber-200 p-1.5 h-fit rounded-full">
                                <Star className="text-white w-5 h-5 lg:w-7 lg:h-7" fill="white" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm md:text-base lg:text-lg text-slate-600">
                                    Rating
                                </span>
                                <span className="text-xl md:text-2xl">
                                    {myDecks?.avg_rating ?? '—'}
                                </span>
                                <span className="text-xs md:text-sm text-slate-400">
                                    {`average ${myDecks?.num_decks !== 1 ? 'across decks' : 'in deck'} `}
                                </span>
                            </div>
                        </div>
                        <div className="flex rounded-lg p-3 lg:p-6 gap-2 font-semibold bg-white shadow-md">
                            <div className="bg-purple-200 p-1.5 h-fit rounded-full">
                                <Gamepad2 className="text-white w-5 h-5 lg:w-7 lg:h-7" fill="white" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm md:text-base lg:text-lg text-slate-600">
                                    Rooms
                                </span>
                                <span className="text-xl md:text-2xl">
                                    {myDecks?.num_rooms}
                                </span>
                                <span className="text-xs md:text-sm text-slate-400">
                                    {`${myDecks?.num_rooms !== 1 ? 'rooms' : 'room'} used this deck`}
                                </span>
                            </div>
                        </div>
                        <div className="flex rounded-lg p-3 lg:p-6 gap-2 font-semibold bg-white shadow-md">
                            <div className="bg-green-200 p-1.5 h-fit rounded-full">
                                <BookOpen className="text-white w-5 h-5 lg:w-7 lg:h-7" fill="white" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm md:text-base lg:text-lg text-slate-600">
                                    Study
                                </span>
                                <span className="text-xl md:text-2xl">
                                    {myDecks?.num_sessions}
                                </span>
                                <span className="text-xs md:text-sm text-slate-400">
                                    {`${myDecks?.num_sessions !== 1 ? 'sessions' : 'session'} with this deck`}
                                </span>
                            </div>
                        </div>
                    </div>
            }
            <div className="flex flex-col gap-2 mt-2">
                <span className="font-bold text-3xl text-slate-600">
                    History
                </span>
                <div className="flex flex-col gap-10">
                    {
                        myDecksLoading ?
                            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 justify-items-center items-center">
                                <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                                <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                                <div className="animate-pulse bg-slate-200 w-full h-25 rounded-xl" />
                            </div>
                        :
                            (
                                myDecks?.deck_dict ?
                                    Object.entries(myDecks?.deck_dict ?? {}).map(([time, decks]) => (
                                        <div key={time} className="flex flex-col gap-3" >
                                            <div className="font-semibold text-xl">
                                                {time}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center w-full gap-5">
                                                {
                                                    decks?.map((deck) => (
                                                        <div key={deck?.deck_id} className="w-full flex justify-center">
                                                            <MyDeckCard deck={deck} />
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ))
                                :
                                    <div className="w-full flex flex-col items-center gap-2">
                                        <span className="italic text-slate-600 text-sm">
                                            No decks yet. Let's remedy that!
                                        </span>
                                        <button onClick={() => navigate('/decks/create')} className="hover:cursor-pointer flex justify-center items-center p-2 text-white bg-sky-600 rounded-lg font-semibold">
                                            <Plus className="w-4 h-4" />
                                            <span>
                                                Create Deck
                                            </span>
                                        </button>
                                    </div>
                            )
                    }
                </div>
            </div>
        </div>
    )
}