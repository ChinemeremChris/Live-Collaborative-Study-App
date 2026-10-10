import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../contexts/UserContext"
import { useParams } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { PageSpinner } from "../components/PageSpinner"
import FitText from "../components/FitGameQuestionText"
import { Square } from "lucide-react"
import { ImageModal } from "../components/ImageModal"

export const GameResult = () => {
    const { room_id } = useParams()
    const [imageOpen, setImageOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    const pollCount = useRef(0)
    const bg = ["bg-[#FFD700]", "bg-[#C0C0C0]", "bg-[#CD7F32]"]

    const HandleImageZoom = (e, image) => {
        e.stopPropagation()
        setImageOpen(true)
        setSelectedImage(image)
    }

    const GetRoomInfo = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${room_id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })

        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map((e) => e.msg).join(', ')
                throw new Error(message || "Error with input to server")
            }
            throw new Error(error.detail || "Error fetching room info")
        }
        return response.json()
    }
    const {
        data: room,
        isLoading: roomLoading,
        isError: roomIsError,
        error: roomError
    } = useQuery({
        queryKey: ["rooms", room_id],
        queryFn: () => {
            pollCount.current += 1
            return GetRoomInfo()
        },
        refetchInterval: (data) => {
            if (pollCount.current > 10) return false
            const hasScores = data?.scores?.some(p => p.score > 0 || p.placement)
            return hasScores ? false : 3000
        },
        staleTime: 0
    })

    useEffect(() => {
        if(roomIsError){
            toast.error(roomError.message || "Error fetching room info")
        }
    }, [roomIsError, roomError])

    const hasResults = room?.scores?.some(p => p.placement)
    if (roomLoading) return <PageSpinner message="Fetching room info..." />


    if (roomLoading || !hasResults) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-sky-800 border-t-transparent rounded-full" />
            <div className="text-lg font-semibold">Saving results...</div>
            <div className="text-sm text-slate-500">Just a moment</div>
        </div>
    )

    if (pollCount.current >= 10 && !hasResults) return (
        <div className="w-full h-screen text-3xl justify-center items-center">
            Results unavailable — please check your room history
        </div>
    )

    return (
        <>
            {
                room ? 
                    <div className="bg-linear-to-r from-[#000046] to-[#1CB5E0] w-full min-h-screen flex flex-col text-white p-3 md:px-15 lg:px-25 gap-3">
                        <div className="flex justify-center font-semibold text-3xl md:text-4xl lg:text-5xl">
                            {`${room?.deck_name}`}
                        </div>
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <div className="font-semibold text-xl md:text-2xl lg:text-3xl">
                                Leaderboard
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between rounded-xl py-2 font-semibold md:text-lg lg:text-xl">
                                    <span>
                                        Player
                                    </span>
                                    <span>
                                        Score
                                    </span>
                                </div>
                                <div className="h-40 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
                                    {
                                        room?.scores?.map((scoreObj, index) => (
                                            <div key={index} className={`${index < 3 && bg[index]} font-semibold flex justify-between rounded-xl p-3 md:text-lg lg:text-xl`}>
                                                <span>
                                                    {`${index + 1}. ${scoreObj.name}`}
                                                </span>
                                                <span>
                                                    {`${scoreObj.score}`}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 gap-3 py-2">
                            <div className="font-semibold text-xl md:text-2xl lg:text-3xl">
                                Questions
                            </div>
                            <div className="flex flex-col gap-8">
                                {
                                    room?.questions?.map((questionObj, index) => (
                                        <div key={index} className="bg-white flex flex-col gap-2 p-3 text-black rounded-xl">
                                            <div className="flex items-center min-h-10 font-semibold mb-2 gap-1">
                                                {
                                                    questionObj.prompt_url &&
                                                        <div className="shrink-0 w-20 h-10">
                                                            <img src={questionObj.prompt_url} onClick={(e) => HandleImageZoom(e, questionObj.prompt_url)} className="hover:cursor-zoom-in w-full h-full object-cover" />
                                                        </div>
                                                }
                                                <FitText className="h-10 flex items-center" startFontSize={20}>
                                                    {`${questionObj.prompt}`}
                                                </FitText>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                {
                                                    questionObj.choices?.map((choice, index) => (
                                                        <div key={index} className={`${choice.is_correct ? 'bg-green-500 text-white' : (choice.is_player_choice && 'bg-red-500 text-white')} relative flex gap-2 items-center border rounded-lg p-1`}>
                                                            {
                                                                choice.is_player_choice && 
                                                                    <div className="bg-white absolute w-5 h-5 right-2 top-1/2 -translate-y-1/2 rounded-full" />
                                                            }
                                                            <div className="w-20 h-19">
                                                                <img src={choice.choice_url} onClick={(e) => HandleImageZoom(e, choice.choice_url)} className="hover:cursor-zoom-in w-full h-full object-cover rounded-lg" />
                                                            </div>
                                                            <FitText className="h-15 flex items-center" startFontSize={14}>
                                                                {`${choice.choice_text}`}
                                                            </FitText>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        {
                            imageOpen && <ImageModal image={selectedImage} setImageOpen={setImageOpen} />
                        }
                    </div>
                :
                    <div className="flex min-h-screen text-xl font-semibold justify-center items-center">
                        Room not found
                    </div>
            }
        </>
    )
}