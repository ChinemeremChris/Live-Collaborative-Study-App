export const PreviewCard = ({ index, card_term, card_definition }) => {
    return (
        <div className="flex flex-col gap-3 w-full bg-white rounded-xl py-6 px-4">
            <div className="flex justify-start items-center">
                <div>
                    {index}
                </div>
            </div>
            {/* term */}
            <div>
                <div className="font-semibold text-sm md:text-lg lg:text-xl text-slate-800">
                    Term
                </div>
                <div className="relative md:w-6/7 mr-2">
                    <div className="md:w-full lg:text-xl resize-none overflow-hidden bg-slate-100 rounded-lg outline-none p-3 focus:bg-white focus:border-blue-700 focus:ring-1 focus:ring-sky-700">
                        {card_term}
                    </div>
                </div>
            </div>
            {/* definition */}
            <div>
                <div className="font-semibold text-sm md:text-lg lg:text-xl text-slate-800">
                    Definition
                </div>
                <div className="relative md:w-6/7 mr-2">
                    <div className="md:w-full lg:text-xl resize-none overflow-hidden bg-slate-100 rounded-lg outline-none p-3 focus:bg-white focus:border-blue-700 focus:ring-1 focus:ring-sky-700">
                        {card_definition}
                    </div>
                </div>
            </div>
        </div>
    )
}