import { useMutation } from "@tanstack/react-query"
import { RotateCw, X } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { PreviewCard } from "./PreviewCard"

export const NotesModal = ({ setCards, notesModalOpen, setNotesModalOpen }) => {
    const [notesText, setNotesText] = useState('')
    const [previewCards, setPreviewCards] = useState([])
    const [unparsedLineCount, setUnparsedLineCount] = useState(0)

    const HandleChangeNotesText = (e) => {
        setNotesText(e.target.value)
        e.target.style.height = "auto"
        e.target.style.height = `${e.target.scrollHeight}px`
    }

    const HandleDiscardText = () => {
        setNotesText('')
        setPreviewCards([])
        setUnparsedLineCount(0)
        setNotesModalOpen(false)
    }

    const IsEmptyCard = (card) => {
        return !card.term?.trim() && !card.term_img && !card.definition?.trim() && !card.definition_img
    }
    const HandleSavePreviewCards = () => {
        setNotesText('')
        setCards((prev) => {
            const filledCards = prev.filter((card) => !IsEmptyCard(card))
            const updatedCards = [...filledCards, ...previewCards]
            return updatedCards
        })
        setPreviewCards([])
        setUnparsedLineCount(0)
        setNotesModalOpen(false)
    }

    const GetPreviewCards = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/transform/preview`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                raw_text: notesText
            })
        })

        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map((e) => e.msg).join(', ')
                throw new Error(message || "Error with inputting notes")
            }
            throw new Error(error.detail || "Error fetching preview cards")
        }

        return response.json()
    }

    const {
        mutate: notesMutate
    } = useMutation({
        mutationKey: [notesText],
        mutationFn: GetPreviewCards,
        onSuccess: (data) => {
            const newCards = data.parsed_cards?.map((card) => (
                {
                    term: card.card_term,
                    definition: card.card_definition,
                    term_img: null,
                    definition_img: null
                }
            ))
            setPreviewCards(newCards)
            setUnparsedLineCount(data?.unparsed_count)
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    return (
        <div className={`${notesModalOpen ? 'translate-y-0' : 'translate-y-full'} font-ibm fixed transition-transform duration-300 flex flex-col gap-5 top-0 left-0 z-30 px-4 py-4 w-full h-full bg-slate-50 overflow-y-auto`}>
            <div className="flex flex-col gap-1 shrink-0">
                <div className="flex justify-between items-center">
                    <div className="flex justify-content text-xl md:text-3xl lg:text-4xl font-semibold">
                        Convert Notes to Cards
                    </div>
                    <button className="hover:cursor-pointer" onClick={() => setNotesModalOpen(false)}>
                        <X className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10"/>
                    </button>
                </div>
                <div className="text-slate-500 text-sm md:text-base lg:text-xl">
                    Copy and Paste notes here to convert them to flashcards. Use colons, hyphens, tabs, new lines, or other separators.
                </div>
            </div>
            <div className="w-full shrink-0">
                <textarea value={notesText} onChange={(e) => HandleChangeNotesText(e)} className="lg:text-xl w-full max-h-[32vh] overflow-y-auto resize-none hide-scrollbar p-2 rounded-lg bg-white border border-black outline-none focus:border-blue-700 focus:ring-sky-700 focus:ring-1" />
            </div>
            <div className="flex flex-col gap-2 flex-1 min-h-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-baseline gap-2">
                        <div className="text-xl md:text-2xl lg:text-3xl font-semibold">Preview</div>
                        {
                            unparsedLineCount > 0 &&
                                <div className="text-sm md:text-base lg:text-lg text-slate-500">
                                    {`${unparsedLineCount} ${unparsedLineCount === 1 ? 'line' : 'lines'} unparsed`}
                                </div>
                        }
                    </div>
                    <button onClick={notesMutate} className="hover:cursor-pointer">
                        <RotateCw className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
                    </button>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto">
                    {
                        previewCards?.map((card, index) => (
                            <PreviewCard key={index+1} index={index+1} card_term={card.term} card_definition={card.definition} />
                        ))
                    }
                </div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:justify-end md:gap-4 shrink-0">
                <button onClick={HandleSavePreviewCards} className="flex justify-center items-center lg:text-xl py-2 lg:py-3 md:px-4 lg:px-6 border rounded-xl bg-sky-700 text-white text-base font-semibold">
                    Save Cards
                </button>
                <button onClick={HandleDiscardText} className="flex justify-center items-center lg:text-xl py-2 lg:py-3 md:px-4 lg:px-6 border rounded-xl text-base font-semibold">
                    Discard Changes
                </button>
            </div>
        </div>
    )
}