export const DraftModal = ({ draftModalOpen, HandleDiscardDraft, HandleLoadDraft }) => {
    return (
        <div className={`${draftModalOpen ? 'translate-x-0' : '-translate-x-full -ml-2'} transition-transform duration-500 flex flex-col fixed bottom-2 left-2 z-20 w-5/6 md:w-1/2 lg:w-1/3 px-4 py-2 gap-4 md:gap-6 lg:gap-8 rounded-xl bg-black text-white lg:text-lg`}>
            <div>
                Do you want to continue editing your prior deck draft?
            </div>
            <div className="flex justify-between">
                <button className="hover:cursor-pointer" onClick={HandleDiscardDraft}>
                    Discard Draft
                </button>
                <button className="hover:cursor-pointer" onClick={HandleLoadDraft}>
                    Load Draft
                </button>
            </div>
        </div>
    )
}