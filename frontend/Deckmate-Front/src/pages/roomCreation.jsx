import { useNavigate, useSearchParams } from "react-router-dom"
import { PageSpinner } from "../components/PageSpinner"
import { RoomSearchModal } from "../components/RoomSearchModal"
import { useAuth } from "../contexts/UserContext"
import toast from "react-hot-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { RoomCard } from "../components/RoomCard"

export const RoomCreate = () => {
    const {user, userLoading} = useAuth()
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()
    const deck_id = searchParams.get("deck_id")
    const navigate = useNavigate()
    const [timeInterval, setTimeInterval] = useState(60)
    const [cards, setCards] = useState([])
    const [allowDelete, setAllowDelete] = useState(cards?.length > 4)

    const HandleDoubleClick = (new_deck_id) => {
        setSearchParams({
            deck_id: new_deck_id
        })
    }

    const HandleIntervalChange = (e) => {
        setTimeInterval(e.target.value)
    }

    const handleTextChange = (e, index, col) => {
        setCards((prev) => (
            prev.map((card, i) => (
                i !== index ? card : {...card, [col]: e.target.value}
            )
        )))
        e.target.style.height = "auto"
        e.target.style.height = `${e.target.scrollHeight}px`
    }

    const handleDeleteCard = (index) => {
        setCards((card) => (
            cards.filter((card, i) => {
                if (i !== index){
                    return card
                }
            })
        ))
    }

    const ValidateFields = () => {
        cards.forEach((card, index) => {
            if (card.card_term?.length > 250){
                toast.error(`Card ${index+1}: Term cannot exceed 250 characters`)
                return
            }
            if (card.card_definition?.length > 250){
                toast.error(`Card ${index+1}: Definition cannot exceed 250 characters`)
                return
            }
            if (!card.card_term && !card.card_term_url){
                toast.error(`Card ${index+1}: Card term must have either a text or image`)
                return
            }
            if (!card.card_definition && !card.card_definition_url){
                toast.error(`Card ${index+1}: Card definition must have either a text or image`)
                return
            }
        })
        cardSubmit()
    }

    const CreateGame = async () => {
        const gameCards = cards.map((card) => {
            return {
                card_id: card.card_id,
                room_question: card.card_term,
                short_answer: card.card_definition
            }
        })

        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${deck_id}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                interval: timeInterval,
                roomQA: gameCards
            })
        })

        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map((e) => e.msg).join(', ')
                throw new Error (message)
            }
            throw new Error (error.detail || "Failed to create game")
        }

        return response.json()
    }

    const GetDeck = async () => {
        if (!deck_id) return
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/edit/${deck_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error (error.detail || "Error fetching deck")
        }
        return response.json()
    }

    const {
        data: deck,
        isFetching: deck_loading,
        isError: is_deck_error,
        error: deck_error
    } = useQuery({
        queryKey: ["rooms", deck_id],
        queryFn: GetDeck,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: true,
        enabled: deck_id?.length > 0 ? true : false
    })

    const {
        mutate: cardSubmit,
        isPending: cardSubmitPending
    } = useMutation({
        mutationFn: CreateGame,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: (data) => {
            console.log("success")
            queryClient.invalidateQueries({
                queryKey: ["pastRooms", user?.id]
            })
            navigate(`/rooms/lobby/${data.room_id}`)
        }
    })

    useEffect(() => {
        if (is_deck_error && deck_error){
            toast.error(deck_error.message || "Error loading deck")
        }
    }, [is_deck_error, deck_error])

    useEffect(() => {
        if (deck_loading) return
        const loaded_cards = deck?.cards?.map((card) => (
            {
                card_id: card.card_id,
                card_term: card.card_term,
                card_definition: card.card_definition,
                card_term_url: card.card_term_url,
                card_definition_url: card.card_definition_url
            }
        ))
        setCards(loaded_cards)
    }, [deck, deck_loading])

    useEffect(() => {
        setAllowDelete(cards?.length > 4)
    }, [cards])


    return (
        <div className="flex flex-col w-full min-h-screen h-full bg-slate-50 px-5 py-3 gap-4">
            {!deck_id && <RoomSearchModal HandleDoubleClick={HandleDoubleClick} />}
            <div className="flex flex-col px-4">
                <label className="flex flex-col mb-2">
                    <span>Time per questions</span>
                    <span>(seconds)</span>
                </label>
                <input type="text" onChange={(e) => HandleIntervalChange(e)} className="w-30 bg-white p-2 border-2 border-gray-400" value={timeInterval} placeholder="Interval between questions" />
            </div>
            <div className="flex flex-col gap-5 w-full p-2 md:px-7 flex-1 min-h-0">
                {
                    deck &&
                        cards?.map((card, index) => (
                            <RoomCard key={index} handleTextChange={handleTextChange} handleDeleteCard={handleDeleteCard} allowDelete={allowDelete} index={index} term={card.card_term} definition={card.card_definition} term_image={card.card_term_url} definition_image={card.card_definition_url} />
                        ))
                }
            </div>
            <div className="flex justify-center px-6 py-3 md:px-7 shrink-0">
                <button type="button" onClick={ValidateFields} className="hover:cursor-pointer w-full md:w-3/4 lg:w-1/2 p-2 rounded-xl md:text-xl lg:text-2xl bg-sky-600 text-white font-semibold">
                    {`${cardSubmitPending ? 'Creating Game...' : 'Create Game'}`}
                </button>
            </div>
        </div>
    )
}