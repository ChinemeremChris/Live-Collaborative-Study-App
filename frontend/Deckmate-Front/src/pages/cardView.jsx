import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { FlashCard } from "../components/FlashCard"
import { PageSpinner } from "../components/PageSpinner"
import { ChevronLeft, MoveLeft, MoveRight } from "lucide-react"


export const CardView = () => {
    const navigate = useNavigate()
    const { deck_id } = useParams()
    const [currentCard, setCurrentCard] = useState(0)
    const [transitionDirection, setTransitionDirection] = useState(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const [isFlipped, setIsFlipped] = useState(false)
   
    const GetCards = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/cards/${deck_id}`, {
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
            throw new Error(error.detail || "Error loading cards")
        }
        return response.json()
    }


    const {
        data: cards,
        isLoading: cardsLoading
    } = useQuery({
        queryKey: ["cards", deck_id],
        queryFn: GetCards,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 5
    })


    const HandleMoveForward = () => {
        if(currentCard < cards.length - 1 && !isAnimating){
            setIsAnimating(true)
            setTransitionDirection("forward")
            setIsFlipped(false)
            setTimeout(() => {
                setCurrentCard((prev) => prev + 1)
                setTransitionDirection(null)
                setIsAnimating(false)
            }, 300);
        }
    }


    const HandleMoveBackward = () => {
        if(currentCard > 0 && !isAnimating){
            setIsAnimating(true)
            setTransitionDirection("backward")
            setIsFlipped(false)
            setTimeout(() => {
                setCurrentCard((prev) => prev - 1)
                setTransitionDirection(null)
                setIsAnimating(false)
            }, 300);
        }
    }


    // useEffect(() => {
    //     console.log("cards", cards)
    // }, [])


    return (
        <>
            {
                !cardsLoading ?
                    (
                        cards ?
                            <div className="flex flex-col w-full h-screen gap-1.5 px-1 pt-4 bg-slate-100">
                                <button className="hover:cursor-pointer text-sky-600 flex items-center px-3 md:px-9 lg:px-22" onClick={() => navigate(`/decks/${deck_id}`, { replace: true })}>
                                    <ChevronLeft />
                                    <div>Back</div>
                                </button>
                                <div className="text-xl md:text-3xl lg:text-5xl font-semibold px-3 md:px-9 lg:px-22">
                                    {cards[0]?.deck_name}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <FlashCard card={cards[currentCard]} isFlipped={isFlipped} setIsFlipped={setIsFlipped} transitionDirection={transitionDirection} />
                                    <div className="flex w-3/4 justify-between items-center text-slate-600">
                                        <button type="button" className={`${currentCard <= 0 ? 'bg-slate-200 text-slate-300' : 'bg-slate-300'} hover:cursor-pointer px-4 py-1 rounded-3xl`} disabled={currentCard <= 0 || isAnimating} onClick={HandleMoveBackward}>
                                            <MoveLeft className="w-7 h-7" />
                                        </button>
                                        <div>
                                            {`${currentCard + 1}/${cards.length}`}
                                        </div>
                                        <button type="button" className={`${currentCard >= cards.length - 1 ? 'bg-slate-200 text-slate-300' : 'bg-slate-300'} hover:cursor-pointer px-4 py-1 rounded-3xl`} disabled={currentCard >= cards.length - 1 || isAnimating} onClick={HandleMoveForward}>
                                            <MoveRight className="w-7 h-7" />
                                        </button>
                                    </div>
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
