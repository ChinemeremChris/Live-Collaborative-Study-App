import { QueryClient, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { replace, useNavigate, useParams } from "react-router-dom"
import { PageSpinner } from "../components/PageSpinner"
import { RatingStars } from "../components/RatingStars"
import { RateInput } from "../components/RateInput"
import { useAuth } from "../contexts/UserContext"
import { CompartNumber } from "../lib/compact"
import { TimeAgo } from "../lib/timeAgo"
import { CardStackIcon } from "../components/CardStackIcon"
import { Clock, Gamepad2, Minus, Play, Plus, SquarePen, Trash2 } from "lucide-react"
import { DeleteModal } from "../components/DeleteModal"

export const DeckView = () => {
    const { user, userLoading } = useAuth()
    const [rating, setRating] = useState()
    const [fullTags, setFullTags] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const { deck_id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const GetDeck = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/${deck_id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error (error.detail || "Error fetching deck")
        }
        return response.json()
    }

    const handleRating = async (star) => {
        const prev_rating = rating
        setRating(star)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/rate/${deck_id}`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(star)
        })
        if (!response.ok){
            const error = await response.json()
            setRating(prev_rating)
            if (response.status === 422) {
                const messages = error.detail.map(e => e.msg).join(', ')
                throw new Error(messages)
            }
            throw new Error(error.detail || "Error submitting deck rating. Try again")
        }
        return response.json()
    }

    const HandleDeckDelete = async () => {
        setDeleteModalOpen(false)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/${deck?.deck_id}`, {
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
                throw new Error(message)
            }
            throw new Error(error.detail || "Error deleting deck")
        }
        return response.json()
    }

    const {
        data: deck,
        isLoading: deck_loading,
        isError: is_deck_error,
        error: deck_error
    } = useQuery({
        queryKey: ["deck", deck_id],
        queryFn: GetDeck,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: true
    })

    const {
        mutate: rating_mutate
    } = useMutation({
        mutationFn: handleRating,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["deck", deck_id]
            })
        }
    })

    const {
        mutate: deleteDeck
    } = useMutation({
        mutationFn: HandleDeckDelete,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["deck", deck_id]
            })
            toast.success("Deck deleted")
            navigate(`/`, { replace: true })
        }
    })

    useEffect(() => {
        console.log(deck)
        console.log((new Date))
    }, [deck])

    useEffect(() => {
        if (is_deck_error){
            toast.error(deck_error.message)
        }
    }, [is_deck_error, deck_error])

    return (
        <>
            {
                !deck_loading ?
                    (
                        deck ? 
                            <div className="flex flex-col px-3 md:px-7 lg:px-10 w-full gap-3">
                                <div className="flex flex-col md:flex-row md:items-start gap-2 md:justify-between lg:items-end py-4 border-b border-slate-300">
                                    <div className="flex flex-col gap-2">
                                        <div className="font-semibold text-2xl md:text-3xl lg:text-5xl">{deck.deck_name}</div>
                                        <div className="flex gap-2 text-xs lg:text-lg">
                                            <div className="flex items-center gap-0.5 text-slate-500">
                                                <CardStackIcon className="w-4 h-4" />
                                                <div>{`${deck?.card_count} ${deck?.card_count !== 1 ? 'cards' : 'card'}`}</div>
                                            </div>
                                            <div className="flex items-center gap-0.5 text-slate-500">
                                                <Clock className="w-4 h-4" />
                                                <div>{`Updated ${deck?.updated_at === today ? 'today' : TimeAgo(deck?.updated_at)}`}</div>
                                            </div>
                                        </div>
                                        {
                                            deck.avg_rating > 0 &&
                                                <div className="flex gap-2 items-center text-sm lg:text-lg">
                                                    <RatingStars rating={deck?.avg_rating} />
                                                    <div className="text-slate-400">{deck?.avg_rating}</div>
                                                    <div className="text-slate-400">{`(${CompartNumber(deck?.num_ratings)} ${deck?.num_ratings > 1 ? 'ratings' : 'rating'})`}</div>
                                                </div>
                                        }
                                    </div>
                                    <div className="flex flex-wrap text-sm justify-end lg:text-lg gap-2">
                                        {
                                            (!userLoading && user && deck?.due_cards_count > 0 ) &&
                                                <button type="button" onClick={() => navigate(`/study/${deck?.deck_id}`)} disabled={deck?.due_cards_count <= 0} className="flex gap-0.5 items-center bg-sky-500 text-white rounded-md py-1 px-2 hover:cursor-pointer">
                                                    <Play className="w-4 h-4" fill="white" />
                                                    <div>{`Study Now`}</div>
                                                </button>
                                        }
                                        <button type="button" onClick={() => navigate(`/cards/${deck_id}`)} className="flex gap-0.5 items-center border border-slate-300 rounded-md py-1 px-2 hover:cursor-pointer">
                                            <Play className="w-4 h-4" fill="black" />
                                            <div>{`See Cards`}</div>
                                        </button>
                                        {
                                            (!userLoading && user) &&
                                                <button type="button" className="flex gap-0.5 items-center bg-sky-500 text-white rounded-md py-1 px-2 hover:cursor-pointer">
                                                    <Gamepad2 className="w-4 h-4" />
                                                    <div>{`Create Room`}</div>
                                                </button>
                                        }
                                    </div>
                                </div>
                                {
                                    (!userLoading && user) &&
                                        <div className="grid grid-cols-2 gap-2 pb-4 md:grid-cols-4 border-b border-slate-300">
                                            <div className="bg-blue-50 border-blue-200 flex flex-col p-2 border rounded-xl text-blue-700 font-semibold">
                                                <div className="text-sm">Study time</div>
                                                <div className="text-base">{CompartNumber(deck?.study_time_minutes)}</div>
                                                <div className="text-xs">minutes</div>
                                            </div>
                                            <div className="bg-amber-50 border-amber-200 flex flex-col p-2 border rounded-xl text-amber-700 font-semibold">
                                                <div className="text-sm">Due today</div>
                                                <div className="text-base">{CompartNumber(deck?.due_cards_count)}</div>
                                                <div className="text-xs">{`of ${deck?.card_count} cards`}</div>
                                            </div>
                                            <div className="bg-green-50 border-green-200 flex flex-col p-2 border rounded-xl text-green-700 font-semibold">
                                                <div className="text-sm">Sessions</div>
                                                <div className="text-base">{CompartNumber(deck?.study_session_count)}</div>
                                                <div className="text-xs">{`last: ${deck?.last_session ? TimeAgo(deck?.last_session) : 'None'}`}</div>
                                            </div>
                                            <div className="bg-slate-50 border-slate-200 flex flex-col p-2 border rounded-xl text-slate-700 font-semibold">
                                                <div className="text-sm">Mastered</div>
                                                <div className="text-base">{CompartNumber(deck?.mastered_cards)}</div>
                                                <div className="text-xs">cards</div>
                                            </div>
                                        </div>
                                }
                                {
                                    (!userLoading && user && deck?.due_cards_count > 0) &&
                                        <div className="lg:hidden pb-3 border-b border-slate-300">
                                            <div className="flex p-3 rounded-lg justify-between bg-sky-600 text-white">
                                                <div className="flex flex-col font-semibold">
                                                    <div className="text-xs">Ready to study?</div>
                                                    <div>{`${deck?.due_cards_count} ${deck?.due_cards_count !== 1 ? 'cards' : 'card'} due today`}</div>
                                                </div>
                                                <button type="button" onClick={() => navigate(`/study/${deck?.deck_id}`)} disabled={deck?.due_cards_count <= 0} className="flex gap-2 p-1 text-sm font-semibold justify-center items-center border border-slate-200 rounded-xl">
                                                    <Play className="w-4 h-4" fill="white" />
                                                    <div>Study Now</div>
                                                </button>
                                            </div>
                                        </div>
                                }
                                <div className="flex flex-col md:flex-row">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 pb-5 border-b border-slate-300  md:w-2/3 md:border-b-0 md:border-r">
                                        {
                                            deck?.preview_cards?.map((card) => (
                                                <div key={card.card_id} className="flex flex-col p-2 gap-4 lg:p-4 border overflow-hidden border-slate-200 rounded-lg lg:text-xl h-36 lg:h-42">
                                                    <div className={`${!card.card_term && card.card_term_url ? 'border-b border-slate-200' : ''} font-semibold text-slate-800 shrink-0`}>                                                        <div className="line-clamp-2">{card.card_term}</div>
                                                        {
                                                            (!card?.card_term && card?.card_term_url) &&
                                                                <div>
                                                                    <img src={`${card.card_term_url}`} alt="image of card term" className="object-cover w-full max-h-16 rounded mt-1" />
                                                                </div>
                                                        }
                                                    </div>
                                                    <div className="text-sm lg:text-base text-slate-500 min-h-0">
                                                        <div className="line-clamp-3">{card.card_definition}</div>
                                                        {
                                                            (!card?.card_definition && card?.card_definition_url) &&
                                                                <div>
                                                                    <img src={`${card.card_definition_url}`} alt="image of card definition" className="object-cover w-full max-h-20 rounded mt-1" />
                                                                </div>
                                                        }
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {
                                            deck?.card_count > 4 &&
                                                <button onClick={() => navigate(`/cards/${deck?.deck_id}`)} className="hover:cursor-pointer flex col-span-full justify-self-center py-2 lg:h-fit px-3 rounded-md justify-center items-center bg-sky-500 text-white">
                                                    {`Show all ${deck?.card_count} cards`}
                                                </button>
                                        }
                                    </div>
                                    <div className="flex flex-col gap-3 md:w-1/3 p-3">
                                        {
                                            (!userLoading && user && deck?.due_cards_count > 0) &&
                                                <div className="hidden lg:block pb-3 border-b border-slate-300">
                                                    <div className="flex p-3 rounded-lg justify-between bg-sky-600 text-white">
                                                        <div className="flex flex-col font-semibold">
                                                            <div className="text-base">Ready to study?</div>
                                                            <div>{`${deck?.due_cards_count} ${deck?.due_cards_count !== 1 ? 'cards' : 'card'} due today`}</div>
                                                        </div>
                                                        <button type="button" onClick={() => navigate(`/study/${deck?.deck_id}`)} disabled={deck?.due_cards_count <= 0} className={`hover:cursor-pointer flex gap-2 p-1 text-base font-semibold justify-center items-center border border-slate-200 rounded-xl`}>
                                                            <Play className="w-4 h-4" fill="white" />
                                                            <div>Study Now</div>
                                                        </button>
                                                    </div>
                                                </div>
                                        }
                                        <div className="font-semibold lg:text-lg">About this deck</div>
                                        <div className="flex gap-3 p-3 border border-slate-200 rounded-xl">
                                            <div className="w-10 h-10 rounded-3xl border flex justify-center items-center p-2 text-lg lg:text-xl font-semibold bg-sky-50 text-sky-600">
                                                {`${deck?.creator_name.split(" ")[0][0]?.toUpperCase()}${deck?.creator_name.split(" ")[1][0]?.toUpperCase()}`}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="line-clamp-1 font-semibold lg:text-lg">{deck?.creator_name}</div>
                                                <div className="text-sm lg:text-base text-slate-500">{`${CompartNumber(deck?.creator_deck_count)} public ${deck?.creator_deck_count === 1 ? 'deck' : 'decks'}`}</div>
                                            </div>
                                        </div>
                                        {
                                            (!userLoading && user && deck?.creator_id === user?.id) && 
                                                <div>
                                                    <div className="flex justify-between text-base font-semibold text-white border-b border-slate-300 pb-4">
                                                        <button className="flex bg-blue-500 rounded-xl py-2 px-8 md:px-4 lg:px-10 gap-1 justify-center items-center">
                                                            <SquarePen className="w-4 h-4"/>
                                                            <div>Edit</div>
                                                        </button>
                                                        <button onClick={() => setDeleteModalOpen(true)} className="flex bg-red-500 rounded-xl py-2 px-8 md:px-4 lg:px-10 gap-1 justify-center items-center">
                                                            <Trash2 className="w-4 h-4"/>
                                                            <div>Delete</div>
                                                        </button>
                                                    </div>
                                                    <DeleteModal deleteModalOpen={deleteModalOpen} setDeleteModalOpen={setDeleteModalOpen} deleteDeck={deleteDeck} />
                                                </div>
                                        }
                                        <div className="flex flex-wrap gap-2">
                                            {
                                                deck?.tags?.slice(0, 3).map((tag) => (
                                                    <div key={tag.tag_id} onClick={() => navigate(`/discover?filter_tags=${tag.tag_id}`)} className="hover:cursor-pointer p-2 bg-sky-500 text-xs lg:text-sm font-semibold rounded-3xl text-white">
                                                        {tag.tag_name}
                                                    </div>
                                                ))                                               
                                            }
                                            {
                                                fullTags &&
                                                    deck?.tags?.slice(3, deck?.tags?.length).map((tag) => (
                                                        <div key={tag.tag_id} onClick={() => navigate(`/discover?filter_tags=${tag.tag_id}`)} className="hover:cursor-pointer p-2 bg-sky-500 text-xs lg:text-sm font-semibold rounded-3xl text-white">
                                                            {tag.tag_name}
                                                        </div>
                                                    ))    
                                            }
                                            {
                                                deck?.tags?.length - 3 > 0 &&
                                                    <button onClick={() => setFullTags((prev) => !prev)} className="flex justify-center items-center bg-slate-200 py-1 px-2 rounded-4xl">
                                                        {fullTags ? <Minus className="w-2 h-2" /> : <Plus className="w-2 h-2" />}
                                                        {!fullTags && deck?.tags?.length - 3}
                                                    </button>
                                            }

                                        </div>
                                        {
                                            (!userLoading && user) &&
                                                <div className="flex flex-col gap-1 py-4">
                                                    <div className="font-semibold lg:text-lg">Your Progress</div>
                                                    <div className="flex flex-col gap-1 border-b border-slate-300">
                                                        <div className="flex justify-between border-b border-slate-200 py-1 text-sm lg:text-base">
                                                            <div>Cards Reviewed</div>
                                                            <div>{deck?.cards_reviewed}</div>
                                                        </div>
                                                        <div className="flex justify-between py-1 text-sm lg:text-base">
                                                            <div>First Studied</div>
                                                            <div>{deck?.first_review_date ? TimeAgo(deck?.first_review_date) : 'Never'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col pt-3 gap-3">
                                                        <div className="flex flex-col">
                                                            <div className="font-semibold lg:text-lg">Rate this deck</div>
                                                            <div className="text-sm lg:text-base">How helpful was this deck?</div>
                                                        </div>
                                                        <div className="flex justify-center">
                                                            <RateInput rating={deck?.my_rating} rating_mutate={rating_mutate} />
                                                        </div>
                                                    </div>
                                                </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        :
                            <div>
                                Deck not found
                            </div>
                    )
                :
                    <PageSpinner message="Loading Deck..." />
            }
        </>
    )
}