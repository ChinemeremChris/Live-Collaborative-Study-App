import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { FlashCard } from "../components/FlashCard"
import { PageSpinner } from "../components/PageSpinner"
import { MoveLeft, MoveRight, RotateCcw, Square } from "lucide-react"
import toast from "react-hot-toast"
import { StudySummary } from "./StudySummary"


export const StudyView = () => {
    const { deck_id } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const studyMode = searchParams.get("study_mode")
    const startingSession = useRef(false)
    const [sessionID, setSessionID] = useState(null)
    const [currentCard, setCurrentCard] = useState(0)
    const [transitionDirection, setTransitionDirection] = useState(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const [isFlipped, setIsFlipped] = useState(false)
    const [studyComplete, setStudyComplete] = useState(false)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
   
    const GetStudyCards = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/${deck_id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422) {
                const messages = error.detail.map(e => e.msg).join(', ')
                throw new Error(messages)
            }
            throw new Error(error.detail || "Error loading study cards")
        }
        return response.json()
    }

    const StartSession = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/${deck_id}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error(message)
            }
            throw new Error(error.detail)
        }
        return response.json()
    }

    const HandleRate = async ({ rating, card_id }) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/progress/${card_id}`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session_id: sessionID,
                rating
            })
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const msg = error.detail.map(e => e.msg).join(", ")
                throw new Error(msg)
            }
            throw new Error(error.detail || "Error inputting rating")
        }
        queryClient.invalidateQueries({
            queryKey: ["deck", deck_id]
        })
        setIsAnimating(true)
        setTransitionDirection("forward")
        setIsFlipped(false)
        setTimeout(() => {
            if (currentCard < cards?.length - 1){
                setCurrentCard((prev) => prev + 1)
            }else{
                sessionEnd()
            }
            setTransitionDirection(null)
            setIsAnimating(false)
        }, 300);
        return response.json()
    }

    const ResetCardProgress = async ({ card_id }) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/progress/${card_id}`, {
            method: "PATCH",
            credentials: "include"
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error (message || "Error resetting card progress")
            }
            throw new Error(error.detail || "Error resettingcard progress")
        }
        return response.json()
    }

    const EndSession = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/${sessionID}`, {
            method: "PATCH",
            credentials: "include"
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422) {
                const messages = error.detail.map(e => e.msg).join(', ')
                throw new Error(messages)
            }
            throw new Error(error.detail || "Error loading study cards")
        }
        return response.json()
    }

    const {
        mutate: sessionEnd
    } = useMutation({
        mutationFn: EndSession,
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["due_decks"]
            })
            queryClient.invalidateQueries({
                queryKey: ["studySessions", { limit: 3 }]
            })
            queryClient.invalidateQueries({
                queryKey: ["stats"]
            })
            navigate(`/study/summary/${deck_id}?session_id=${sessionID}`, { replace: true })
        },
        onError: (error) => {
            toast.error(error.message || "Error ending study session")
        }
    })

    const {
        data: cards,
        isLoading: cardsLoading,
        isSuccess: cardsLoaded
    } = useQuery({
        queryKey: ["cards", deck_id],
        queryFn: GetStudyCards,
        staleTime: 1000 * 60 * 20,
        gcTime: 1000 * 60 * 20
    })

    const {
        mutate: sessionStart,
        isError: isSessionError,
        error: sessionError
    } = useMutation({
        mutationFn: StartSession,
        onSuccess: (data) => {
            console.log("sessionID", data?.study_session)
            setSessionID(data?.study_session)
            setSearchParams((prev) => {
                prev.set("session_id", data?.study_session)
                return prev
            }, { replace: true })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const {
        mutate: submitRating
    } = useMutation({
        mutationFn: HandleRate,
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const {
        mutate: resetCardProgress
    } = useMutation({
        mutationFn: ResetCardProgress,
        onSuccess: (data) => {
            toast.success("Successfully reset card progress")
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    useEffect(() => {
        const existingSessionID = searchParams.get("session_id")
        if (existingSessionID){
            setSessionID(existingSessionID)
            return
        }
        if (startingSession.current) return
        startingSession.current = true
        sessionStart()
    }, [deck_id])


    const TakeHeartBeat = async () => {
        if (!sessionID || studyComplete) return
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/heartbeat/${sessionID}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const msg = error.detail.map(e => e.msg).join(", ")
                throw new Error(msg)
            }
            throw new Error(error.detail || "Error inputting rating")
        }
        return response.json()
    }

    const {
        mutate: heartbeatMutate
    } = useMutation({
        mutationFn: TakeHeartBeat,
        onError: (error) => {
            toast.error(error.message || "Error maintaining study session")
        }
    })

    //set it up so quitting the page or navigating to another page ends session
    useEffect(() => {
        if (!sessionID) return

        const interval = setInterval(() => {
            heartbeatMutate()
        }, 1000 * 60)

        return () => clearInterval(interval)
    }, [sessionID])

    // useEffect(() => {
    //     console.log("cards", cards)
    // }, [])

    if (!sessionID) return <PageSpinner message="Starting session..." />
    if (isSessionError) return <div className="w-full h-full">{sessionError || "Failed to start study session"}</div>

    return (
        <>
            {
                !cardsLoading ?
                    (
                        cards?.length > 0 ?
                            <div className="flex flex-col w-full h-screen gap-1.5 px-1 pt-4 bg-slate-100">
                                <div className="text-xl mb-2 md:text-3xl lg:text-5xl font-semibold px-3 md:px-9 lg:px-22">
                                    {cards[0]?.deck_name}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <FlashCard card={cards[currentCard]} isFlipped={isFlipped} setIsFlipped={setIsFlipped} transitionDirection={transitionDirection} />
                                    <div className="flex p-3 text-center text-lg md:text-xl lg:text-2xl">
                                        {`${currentCard + 1}/${cards?.length}`}
                                    </div>
                                    {
                                        isFlipped ?
                                            <div className="w-11/12 md:w-5/6 grid grid-cols-2 gap-4 md:grid-cols-4 font-semibold">
                                                <button type="button" value="easy" onClick={(e) => submitRating({rating: e.currentTarget.value, card_id: cards[currentCard].card_id})} className="hover:cursor-pointer flex bg-green-500 text-green-900 rounded-lg justify-center items-center px-3 py-1.5">
                                                    Easy
                                                </button>
                                                <button type="button" value="medium" onClick={(e) => submitRating({rating: e.currentTarget.value, card_id: cards[currentCard].card_id})} className="hover:cursor-pointer flex bg-amber-300 text-amber-900 rounded-lg justify-center items-center px-3 py-1.5">
                                                    Medium
                                                </button>
                                                <button type="button" value="hard" onClick={(e) => submitRating({rating: e.currentTarget.value, card_id: cards[currentCard].card_id})} className="hover:cursor-pointer flex bg-red-400 text-red-900 rounded-lg justify-center items-center px-3 py-1.5">
                                                    Hard
                                                </button>
                                                <button type="button" value="forgot" onClick={(e) => submitRating({rating: e.currentTarget.value, card_id: cards[currentCard].card_id})} className="hover:cursor-pointer flex bg-sky-700 text-white rounded-lg justify-center items-center px-3 py-1.5">
                                                    Forgot
                                                </button>
                                            </div>
                                        :
                                            <div className="flex items-center mt-2 gap-3 md:gap-10 lg:gap-22">
                                                <button type="button" className="hover:cursor-pointer flex items-center gap-1 bg-red-700 text-white py-2 px-2 md:px-6 rounded-md font-semibold md:text-lg lg:text-xl" onClick={sessionEnd}>
                                                    <Square className="w-5 h-5 md:w-7 md:h-7 lg:w-9 lg:h-9" />
                                                    <div>Stop Session</div>
                                                </button>
                                                <button type="button" onClick={() => resetCardProgress({ card_id: cards[currentCard].card_id })} className="hover:cursor-pointer flex items-center gap-1 bg-white text-red-700 py-2 px-2 md:px-6 rounded-md font-semibold md:text-lg lg:text-xl">
                                                    <RotateCcw className="w-5 h-5 md:w-7 md:h-7 lg:w-9 lg:h-9" />
                                                    <div>Reset Card</div>
                                                </button>
                                            </div>
                                    }
                                </div>
                            </div>
                        :
                            <div>
                                Failed to fetch cards
                            </div>
                    )
                    :
                <PageSpinner message="Loading cards..." />
            }
        </>
    )
}
