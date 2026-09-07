import { useEffect, useState } from "react"
import { ImageModal } from "./ImageModal"

export const FlashCard = ({ card, isFlipped, setIsFlipped, transitionDirection }) => {
    const { card_id, deck_id, deck_name, card_term, card_definition, card_term_url, card_definition_url } = card
    const [imageOpen, setImageOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    useEffect(() => {
        console.log("flash", card)
    }, [])
    const HandleImageOpen = (e, image) => {
        e.stopPropagation()
        setImageOpen(true)
        setSelectedImage(image)
    }
    return (
        <>
        <div onClick={() => setIsFlipped((prev) => !prev)} className={`transition-all duration-300 ease-in-out ${transitionDirection === 'forward' ? '-translate-x-full opacity-0' : transitionDirection === 'backward' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'} perspective w-full flex justify-center`}>
            <div className={`bg-white w-11/12 lg:w-5/6 h-60 md:h-100 lg:h-150 rounded-xl shadow-lg p-4 md:p-6 lg:p-8 card ${isFlipped ? 'flipped' : ''}`}>
                <div className={`flex flex-col gap-1 md:gap-3 front`}>
                    {/* term image */}
                    {
                        card_term_url &&
                            <div className="h-1/2 shrink-0 pointer-events-auto" onClick={(e) => HandleImageOpen(e, card_term_url)}>
                                <img src={card_term_url} className="object-cover w-full h-full rounded-xl" />
                            </div>
                    }
                    {/* term text */}
                    <div className={`${card_term_url ? 'flex-1 min-h-0 items-start' : 'h-full items-center'} flex justify-center text-center text-xl md:text-3xl lg:text-4xl overflow-y-auto`}>
                        {card_term}
                    </div>
                </div>
                <div className="flex flex-col gap-1 md:gap-3 back">
                    {/* definition image */}
                    {
                        card_definition_url &&
                            <div className="h-1/2 pointer-events-auto" onClick={(e) => HandleImageOpen(e, card_definition_url)}>
                                <img src={card_definition_url} className="object-cover w-full h-full rounded-xl" />
                            </div>
                    }
                    {/* definition text */}
                    <div className={`${card_definition_url ? 'flex-1 min-h-0 items-start' : 'h-full items-center'} flex justify-center text-center text-xl md:text-3xl lg:text-4xl overflow-y-auto`}>
                        {card_definition}
                    </div>
                </div>
            </div>
        </div>
        {imageOpen && (
            <ImageModal
                image={selectedImage}
                setImageOpen={setImageOpen}
            />
        )}
        </>
    )
}