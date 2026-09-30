import { useEffect, useRef, useState } from "react"
import { Globe, Plus } from "lucide-react"
import { useDebounce } from "react-use"
import { DropdownOptions } from "../components/DropdownOptions"
import { CreateCard } from "../components/CreateCard"
import { useAuth } from "../contexts/UserContext"
import { PageSpinner } from "../components/PageSpinner"
import { TagModal } from "../components/TagModal"
import toast from "react-hot-toast"
import { DraftModal } from "../components/DraftModal"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { NotesModal } from "../components/NotesModal"

export const DeckCreate = () => {
    const HasDraftContent = (title, tags, cards) => {
        if (title?.trim()) return true
        if (tags?.length > 0) return true
        return cards?.some(card => 
            card.term?.trim() || card.definition?.trim()
        )
    }

    const navigate = useNavigate()
    const {user, userLoading} = useAuth()
    const initialized = useRef(false)
    const [draftModalOpen, setDraftModalOpen] = useState(false)
    const [tagModalOpen, setTagModalOpen] = useState(false)
    const [notesModalOpen, setNotesModalOpen] = useState(false)
    const [currentOption, setCurrentOption] = useState({value: 'Public', icon: <Globe />})
    const [title, setTitle] = useState('')
    const [tagSet, setTagSet] = useState(new Set())
    const [cards, setCards] = useState([
        {
            term: '',
            definition: '',
            term_img: null,
            definition_img: null
        },
        {
            term: '',
            definition: '',
            term_img: null,
            definition_img: null
        }
    ])
    const [allowDelete, setAllowDelete] = useState(cards?.length > 2)

    useEffect(() => {
        const savedTitle = localStorage.getItem('title')
        const savedTags = localStorage.getItem('tags')
        const savedCards = localStorage.getItem('cards')

        const titleData = savedTitle ? JSON.parse(savedTitle) : ""
        const tagsData = savedTags ? JSON.parse(savedTags) : []
        const cardsData = savedCards ? JSON.parse(savedCards) : []
        if(HasDraftContent(titleData, tagsData, cardsData)){
            console.log("Draft detected")
            setDraftModalOpen(true)
        }else{
            initialized.current = true
        }
    }, [])

    useEffect(() => {
        setAllowDelete(cards?.length > 2)
    }, [cards])

    const truncated_cards = cards.map((card) => (
        {
            term: card.term,
            definition: card.definition,
            term_img: null,
            definition_img: null
        }
    ))

    useDebounce(
        () => {
            if (!initialized.current) return
            localStorage.setItem('title', JSON.stringify(title))
        }, 
        1000 * 2, 
        [title]
    )
    useDebounce(
        () => {
            if (!initialized.current) return
            localStorage.setItem('tags', JSON.stringify([...tagSet]))
        }, 
        1000 * 2, 
        [tagSet]
    )
    useDebounce(
        () => {
            if (!initialized.current) return
            localStorage.setItem('cards', JSON.stringify(truncated_cards))
        }, 
        1000 * 2, 
        [cards]
    )

    const handleImageDelete = (e, index, col) => {
        e.preventDefault()
        setCards((prev) => (
            prev.map((card, i) => (
                index === i ? {...card, [col]: null} : card
            ))
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
                term: '',
                definition: '',
                term_img: null,
                definition_img: null
            }]
        ))
    }

    const HandleDiscardDraft = () => {
        setDraftModalOpen(false)
        localStorage.removeItem('title')
        localStorage.removeItem('tags')
        localStorage.removeItem('cards')
        initialized.current = true
    }

    const HandleLoadDraft = () => {
        setDraftModalOpen(false)
        const savedCards = localStorage.getItem('cards')
        const savedTags = localStorage.getItem('tags')
        const savedTitle = localStorage.getItem('title')

        setCards(savedCards ? JSON.parse(savedCards) : [
            {
                term: '',
                definition: '',
                term_img: null,
                definition_img: null
            },
            {
                term: '',
                definition: '',
                term_img: null,
                definition_img: null
            }
        ])
        setTagSet(savedTags ? new Set(JSON.parse(savedTags)) : new Set())
        setTitle(savedTitle ? JSON.parse(savedTitle) : '')
        initialized.current = true
    }

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
            if (!card.term && !card.term_img){
                toast.error("Each card term must have text and/or image")
                return
            }
            if (!card.definition && !card.definition_img){
                toast.error("Each card definition must have text and/or image")
                return
            }
            if (card.term.length > 5000){
                toast.error("Card term cannot exceed 5000 characters")
                return
            }
            if (card.definition.length > 10000){
                toast.error("Card definition cannot exceed 10000 characters")
                return
            }
        })
        createDeck()
    }

    const UploadImageToS3 = async (imageFile) => {
        if (!imageFile) return null
        const response = await fetch(`${import.meta.env.VITE_API_URL}/cards/image/upload/request`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                file_name: imageFile.name,
                file_type: imageFile.type
            })
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error(message)
            }
            throw new Error (error.detail || "Error uploading image to server")
        }
        const { presigned_url, permanent_url } = await response.json()

        const uploadResponse = await fetch(presigned_url, {
            method: "PUT",
            headers: {
                "Content-Type": imageFile.type
            },
            body: imageFile
        })

        if (!uploadResponse.ok){
            throw new Error ("Failed to upload image to server")
        }

        return permanent_url
    }

    const SaveDeck = async () => {
        const uploadedCards = await Promise.all(
            cards.map(async (card, index) => {
                const [termImageUrl, defintionImageUrl] = await Promise.all([
                    UploadImageToS3(card.term_img),
                    UploadImageToS3(card.definition_img)
                ])

                return {
                    card_temp_id: index,
                    card_term: card.term,
                    card_definition: card.definition,
                    card_term_url: termImageUrl,
                    card_definition_url: defintionImageUrl
                }
            })
        )
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/bulk`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                deck_name: title,
                is_public: currentOption.value === 'Public' || currentOption.value === 'public',
                tags: [...tagSet],
                cards: uploadedCards
            })
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(", ")
                throw new Error (message || "Input is not formatted correctly")
            }
            throw new Error(error.detail || "Error creating deck")
        }
        return response.json()
    }

    const {
        mutate: createDeck
    } = useMutation({
        mutationFn: SaveDeck,
        onSuccess: (data) => {
            HandleDiscardDraft()
            navigate(`/decks/${data.deck_id}`, { replace: true })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    if (userLoading) return <PageSpinner message="Loading Profile..." />

    return (
        <div className="relative">
            {
                (!userLoading && user) ?   
                    <div className="font-ibm bg-slate-50 flex flex-col gap-4 min-h-screen">
                        <div className="sticky top-0 z-10 bg-white flex flex-col px-2 md:px-7 pt-2 pb-5 border-b border-b-slate-200 items-start gap-2 md:flex-row md:justify-between md:items-center">
                            <div className="font-bold text-lg md:text-2xl lg:text-3xl">
                                Create new deck of flashcards
                            </div>
                            <button onClick={ValidateFields} className="hover:cursor-pointer flex justify-center items-center bg-sky-700 font-semibold text-white md:text-lg lg:text-xl py-2 px-5 rounded-4xl">
                                Create
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
                            <DraftModal draftModalOpen={draftModalOpen} HandleDiscardDraft={HandleDiscardDraft} HandleLoadDraft={HandleLoadDraft} />
                        </div>
                        <div className="flex flex-col gap-3 w-full p-2 md:px-7 flex-1 min-h-0">
                            {
                                cards.map((card, index) => (
                                    <CreateCard key={index} index={index} term={card.term} definition={card.definition} term_image={card.term_img} definition_image={card.definition_img} allowDelete={allowDelete} handleImageDelete={handleImageDelete} handleChangeImage={handleChangeImage} handleTextChange={handleTextChange} handleDeleteCard={handleDeleteCard} />
                                ))
                            }
                        </div>
                        <div className="flex justify-center px-6 py-3 md:px-7 shrink-0" onClick={handleAddCard}>
                            <button className="hover:cursor-pointer w-full md:w-3/4 lg:w-1/2 p-2 rounded-3xl md:text-xl lg:text-2xl bg-sky-700 text-white font-semibold">
                                Add Card
                            </button>
                        </div>
                    </div>
                :
                    <div className="flex justify-center">
                            Login or signup to continue
                    </div>
            }
            <NotesModal setCards={setCards} notesModalOpen={notesModalOpen} setNotesModalOpen={setNotesModalOpen} />
        </div>
    )
}