import { Image, Trash, X } from "lucide-react"
import { useId,useEffect, useState } from "react"

export const CreateCard = ({ index, handleImageDelete, handleChangeImage, handleTextChange, handleDeleteCard, allowDelete, term, definition, term_image, definition_image }) => {
    const term_image_id = useId()
    const definition_image_id = useId()
    const [termImageUrl, setTermImageUrl] = useState(null)
    const [definitionImageUrl, setDefinitionImageUrl] = useState(null)

    useEffect(() => {
        if (!term_image) {
            setTermImageUrl(null)
            return
        }

        const url = URL.createObjectURL(term_image)
        setTermImageUrl(url)

        return () => {
            URL.revokeObjectURL(url)
        }
    }, [term_image])

    useEffect(() => {
        if (!definition_image) {
            setDefinitionImageUrl(null)
            return
        }

        const url = URL.createObjectURL(definition_image)
        setDefinitionImageUrl(url)

        return () => {
            URL.revokeObjectURL(url)
        }
    }, [definition_image])
    return (
        <div className="flex flex-col gap-3 w-full bg-white rounded-xl py-6 px-4">
            <div className="flex justify-between items-center">
                <div>
                    {index+1}
                </div>
                <button disabled={!allowDelete} className="hover:cursor-pointer" onClick={() => handleDeleteCard(index)}>
                    <Trash color={`${allowDelete ? 'red' : 'gray'}`} className="w-4.5 h-4.5" />
                </button>
            </div>
            {/* term */}
            <div>
                <div className="font-semibold text-sm md:text-lg lg:text-xl text-slate-800">
                    Term
                </div>
                <div className="flex justify-between items-center">
                    <div className="relative md:w-6/7 mr-2">
                        <textarea value={term} onChange={(e)=> handleTextChange(e, index, 'term')} className="md:w-full lg:text-xl resize-none overflow-hidden bg-slate-100 rounded-lg outline-none p-3 focus:bg-white focus:border-blue-700 focus:ring-1 focus:ring-sky-700" />
                        <div className="absolute bottom-2 right-2 text-xs lg:text-base text-slate-400">
                            {`${term.length}/5000`}
                        </div>
                    </div>
                    <div className="w-15 md:w-24 h-15 md:h-24 flex justify-center items-center">
                        <label className="hover:cursor-pointer" htmlFor={term_image_id}>
                            {
                                termImageUrl ? 
                                    <div className="relative w-full h-full">
                                        <X onClick={(e) => handleImageDelete(e, index, 'term_img')} className="bg-red-500 w-6 h-6 absolute right-0 top-0 z-2 text-white rounded-full p-1 hover:cursor-pointer" />
                                        <img src={termImageUrl} className="w-full h-full object-cover" />
                                    </div>
                                :
                                    <div>
                                        <Image className="lg:w-8 lg:h-8" />
                                        <span className="lg:text-lg">Image</span>
                                    </div>
                            }
                        </label>
                        <input id={term_image_id} type="file" accept="image/*" onChange={(e) => handleChangeImage(e, index, 'term_img')} className="hidden" />
                    </div>
                </div>
            </div>
            {/* definition */}
            <div>
                <div className="font-semibold text-sm md:text-lg lg:text-xl text-slate-800">
                    Definition
                </div>
                <div className="flex justify-between items-center">
                    <div className="relative md:w-6/7 mr-2">
                        <textarea value={definition} onChange={(e)=> handleTextChange(e, index, 'definition')} className="md:w-full lg:text-xl resize-none overflow-hidden bg-slate-100 rounded-lg outline-none p-3 focus:bg-white focus:border-blue-700 focus:ring-1 focus:ring-sky-700" />
                        <div className="absolute bottom-2 right-2 text-xs lg:text-base text-slate-400">
                            {`${definition.length}/10000`}
                        </div>
                    </div>
                    <div className="w-15 md:w-24 h-15 md:h-24 flex justify-center items-center">
                        <label className="hover:cursor-pointer" htmlFor={definition_image_id}>
                            {
                                definitionImageUrl ? 
                                    <div className="hover:cursor-pointer relative w-full h-full">
                                        <X onClick={(e) => handleImageDelete(e, index, 'definition_img')} className="bg-red-500 w-6 h-6 absolute right-0 top-0 z-10 text-white rounded-full p-1 hover:cursor-pointer" />
                                        <img src={definitionImageUrl} className="w-full h-full object-cover" />
                                    </div>
                                :
                                    <div>
                                        <Image className="lg:w-8 lg:h-8" />
                                        <span className="lg:text-lg">Image</span>
                                    </div>
                            }
                        </label>
                        <input id={definition_image_id} type="file" accept="image/*" onChange={(e) => handleChangeImage(e, index, 'definition_img')} className="hidden" />
                    </div>
                </div>
            </div>
        </div>
    )
}