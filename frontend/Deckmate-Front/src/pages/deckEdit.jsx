import { ChevronLeft, Globe, HatGlasses, Plus } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../contexts/UserContext"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { DropdownOptions } from "../components/DropdownOptions"
import { TagModal } from "../components/TagModal"
import { NotesModal } from "../components/NotesModal"
import { useNavigate, useParams } from "react-router-dom"
import { UpdateCard } from "../components/UpdateCard"
import { UpdateNotesModal } from "../components/UpdateNotesModal"
import { PageSpinner } from "../components/PageSpinner"

export const DeckEdit = () => {
    const nextTempId = useRef(0)
    const getTempId = () => nextTempId.current++
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { deck_id } = useParams()
    const {user, userLoading} = useAuth()
    const [tagModalOpen, setTagModalOpen] = useState(false)
    const [notesModalOpen, setNotesModalOpen] = useState(false)
    const [currentOption, setCurrentOption] = useState({value: 'Public', icon: <Globe />})
    const [title, setTitle] = useState('')
    const [tagSet, setTagSet] = useState(new Set())
    const [cards, setCards] = useState([])
    const [allowDelete, setAllowDelete] = useState(cards?.length > 4)
    let originalCards = {}


    const ValidateFields = () => {
        if (!title){
            toast.error("Deck must have a title")
            return
        }
        if (title.length < 3){
            toast.error("Deck title must be at least 3 characters")
            return
        }
        if (title.length > 230){
            toast.error("Deck title cannot be more than 230 characters")
            return
        }
        if (cards.length < 4){
            toast.error("Deck must have at least four cards")
            return
        }
        cards.forEach((card) => {
            if (!card.card_term && !card.card_term_url){
                toast.error("Each card term must have text and/or image")
                return
            }
            if (!card.card_definition && !card.card_definition_url){
                toast.error("Each card definition must have text and/or image")
                return
            }
            if (card.card_term.length > 5000){
                toast.error("Card term cannot exceed 5000 characters")
                return
            }
            if (card.card_definition.length > 10000){
                toast.error("Card definition cannot exceed 10000 characters")
                return
            }
        })
        editMutate()
    }

    const handleDeleteCard = (index) => {
        setCards((prev) => (
            prev.filter((card, i) => {
                if (i !== index){
                    return card
                }
            })
        ))
    }

    const handleAddCard = () => {
        setCards((prev) => (
            [...prev, {
                card_temp_id: getTempId(),
                card_id: null,
                card_term: '',
                card_definition: '',
                card_term_url: null,
                card_definition_url: null
            }]
        ))
    }

    const handleChangeImage = (e, index, col) => {
        setCards((prev) => (
            prev.map((card, i) => (
                i === index ? {...card, [col]: e.target.files[0]} : card
            ))
        ))
    }

    const handleTextChange = (e, index, col) => {
        setCards((prev) => (
            prev.map((card, i) => (
                i === index ? {...card, [col]: e.target.value} : card
            ))
        ))
        e.target.style.height = "auto"
        e.target.style.height = `${e.target.scrollHeight}px`
    }

    const handleImageDelete = (e, index, col) => {
        e.preventDefault()
        setCards((prev) => (
            prev.map((card, i) => (
                index === i ? {...card, [col]: null} : card
            ))
        ))
    }

    const GetDeck = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/edit/${deck_id}`, {
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

    const GeneratePresignedURLs = async (files) => {
        if (!files || files.length === 0) return {}
        const imageFiles = files.map((imageFile) => ({
            id: imageFile.id,
            file_name: imageFile.file.name,
            file_type: imageFile.file.type
        }))
        const response = await fetch(`${import.meta.env.VITE_API_URL}/cards/image/upload/request`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(imageFiles)
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error(message)
            }
            throw new Error (error.detail || "Error uploading images to server")
        }
        const urlList = (await response.json()).urls
        const urlDict = {}
        urlList.forEach((item) => {
            urlDict[item.id] = item
        })
        return urlDict
    }

    const EditDeck = async () => {
        let newCardIDs = new Set()
        let newCards = []
        let updatedCards = []
        let images = []
        cards.forEach((card) => {
            card.card_id && newCardIDs.add(card.card_id)
            if(!card.card_id){
                newCards.push({
                    card_temp_id: card.card_temp_id,
                    card_term: card.card_term,
                    card_definition: card.card_definition,
                    card_term_url: card.card_term_url,
                    card_definition_url: card.card_definition_url
                })
            }
            if (card.card_term_url && card.card_term_url instanceof File){
                images.push({
                    id: `${card.card_temp_id}-term`,
                    field: "card_term_url",
                    file: card.card_term_url
                })
            }
            if (card.card_definition_url && card.card_definition_url instanceof File){
                images.push({
                    id: `${card.card_temp_id}-definition`,
                    field: "card_definition_url",
                    file: card.card_definition_url
                })
            }
            if (card.card_id){
                const different = originalCards[card.card_id]?.card_term !== card.card_term || originalCards[card.card_id]?.card_definition !== card.card_definition || originalCards[card.card_id]?.card_term_url !== card.card_term_url || originalCards[card.card_id]?.card_definition_url !== card.card_definition_url
                if (different){    
                    updatedCards.push({
                        card_id: card.card_id,
                        card_temp_id: card.card_temp_id,
                        card_term: card.card_term,
                        card_definition: card.card_definition,
                        card_term_url: card.card_term_url,
                        card_definition_url: card.card_definition_url
                    })
                }
            }
        })
        const deletedCards = Object.keys(originalCards).filter((card) => (
            !newCardIDs.has(card)
        ))
        const urls = images.length > 0 ? await GeneratePresignedURLs(images) : {}
        await Promise.all(
            images.map(async (image) => {
                const response = await fetch(urls[image.id].presigned_url, {
                    method: "PUT",
                    headers: {
                        "Content-Type": image.file.type
                    },
                    body: image.file
                })
                if (!response.ok){
                    throw new Error("Error uploading image to database")
                }
            })
        )
        const finalUpdatedCards = updatedCards.map((card) => ({
            card_id: card.card_id,
            card_term: card.card_term,
            card_definition: card.card_definition,
            card_term_url: urls[`${card.card_temp_id}-term`]?.permanent_url ?? card.card_term_url,
            card_definition_url: urls[`${card.card_temp_id}-definition`]?.permanent_url ?? card.card_definition_url
        }))

        const finalNewCards = newCards.map((card) => ({
            card_temp_id: card.card_temp_id,
            card_term: card.card_term,
            card_definition: card.card_definition,
            card_term_url: urls[`${card.card_temp_id}-term`]?.permanent_url ?? null,
            card_definition_url: urls[`${card.card_temp_id}-definition`]?.permanent_url ?? null
        }))

        const editResponse = await fetch(`${import.meta.env.VITE_API_URL}/decks/bulk/${deck_id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                deck_name: title,
                is_public: currentOption.value === 'Public' || currentOption.value === 'public',
                tags: [...tagSet],
                updated_cards: finalUpdatedCards,
                new_cards: finalNewCards,
                deleted_cards: deletedCards
            })
        })

        if (!editResponse.ok){
            const error = await editResponse.json()
            if (editResponse.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error (message || "Input is not formatted correctly")
            }
            throw new Error(error.detail || "Error updating deck")
        }

        return editResponse.json() 
    }

    const {
        data: deck,
        isLoading: deck_loading,
        isError: is_deck_error,
        error: deck_error
    } = useQuery({
        queryKey: ["edit", deck_id],
        queryFn: GetDeck,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: true
    })

    const {
        mutate: editMutate
    } = useMutation({
        mutationFn: EditDeck,
        onSuccess: (data) => {
            toast.success("Successfully edited deck")
            queryClient.invalidateQueries(["edit", deck_id])
            queryClient.invalidateQueries(["deck", deck_id])
            navigate(`/decks/${deck_id}`, { replace: true })
        },
        onError: (error) => {
            toast.error(error.message, "Error updating deck")
        }
    })

    useEffect(() => {
        if (deck_loading) return
        setTitle(deck?.deck_name)
        setTagSet(new Set(deck?.tags))
        const deckCards = deck?.cards?.map((card) => {
            originalCards[card.card_id] = card
            return {
                card_temp_id: getTempId(),
                card_id: card.card_id,
                card_term: card.card_term,
                card_definition: card.card_definition,
                card_term_url: card.card_term_url,
                card_definition_url: card.card_definition_url
            }
        })
        setCards(deckCards)
        setCurrentOption(() => {
            const option = deck?.is_public ? {value: 'Public', icon: <Globe />} : {value: 'Private', icon : <HatGlasses />}
            return option
        })
        setAllowDelete(deck?.cards?.length > 4)
    }, [deck, deck_loading])

    useEffect(() => {
        if (is_deck_error && deck_error){
            toast.error(deck_error.message || "Error loading deck")
        }
    }, [is_deck_error, deck_error])

    useEffect(() => {
        setAllowDelete(cards?.length > 4)
    }, [cards])

    if (userLoading) return <PageSpinner message="Setting up deck" />

    // do something about a user who doesn't own the deck (message or kick them out of page)
    return (
        <div className="relative">
            <div className="font-ibm bg-slate-50 flex flex-col gap-4 min-h-screen">
                <div className="sticky top-0 z-10 bg-white flex flex-col px-2 md:px-7 pt-2 pb-5 border-b border-b-slate-200 items-start gap-2 md:flex-row md:justify-between md:items-center">
                    <div className="font-bold text-lg md:text-2xl lg:text-3xl">
                        Edit your flashcards
                    </div>
                    <button onClick={ValidateFields} className="hover:cursor-pointer flex justify-center items-center bg-sky-700 font-semibold text-white md:text-lg lg:text-xl py-2 px-5 rounded-4xl">
                        Save Changes
                    </button>
                </div>
                <div className="flex px-2 md:px-7 shrink-0">
                    <DropdownOptions currentOption={currentOption} setCurrentOption={setCurrentOption} />
                </div>
                <div className="w-full flex justify-center px-2 md:px-7 shrink-0">
                    <input type="text" value={title} placeholder="Enter a title for your deck" onChange={(e) => setTitle(e.target.value)} className="bg-white w-full p-3 text-lg lg:text-2xl rounded-lg font-semibold outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-between px-3 md:px-7 lg:text-lg shrink-0">
                    <button onClick={() => setNotesModalOpen(true)} className="flex gap-1 items-center font-semibold text-white bg-sky-700 p-3 rounded-3xl hover:cursor-pointer">
                        <Plus />
                        <span>Convert Notes</span>
                    </button>
                    <button type="button" onClick={() => setTagModalOpen(true)} className="flex justify-center items-center gap-1 rounded-full px-3 bg-sky-700 text-white font-semibold hover:cursor-pointer">
                        <Plus />
                        <span>Tags</span>
                    </button>
                    <TagModal tagSet={tagSet} setTagSet={setTagSet} tagModalOpen={tagModalOpen} setTagModalOpen={setTagModalOpen} />
                </div>
                <div className="flex flex-col gap-3 w-full p-2 md:px-7 flex-1 min-h-0">
                    {
                        cards?.map((card, index) => (
                            <UpdateCard key={card.card_temp_id} index={index} term={card.card_term} definition={card.card_definition} term_image={card.card_term_url} definition_image={card.card_definition_url} allowDelete={allowDelete} handleImageDelete={handleImageDelete} handleChangeImage={handleChangeImage} handleTextChange={handleTextChange} handleDeleteCard={handleDeleteCard} />
                        ))
                    }
                </div>
                <div className="flex justify-center px-6 py-3 md:px-7 shrink-0" onClick={handleAddCard}>
                    <button className="hover:cursor-pointer w-full md:w-3/4 lg:w-1/2 p-2 rounded-3xl md:text-xl lg:text-2xl bg-sky-700 text-white font-semibold">
                        Add Card
                    </button>
                </div>
            </div>
            <UpdateNotesModal getTempId={getTempId} setCards={setCards} notesModalOpen={notesModalOpen} setNotesModalOpen={setNotesModalOpen} />
        </div>
    )
}