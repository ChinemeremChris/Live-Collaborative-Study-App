import { useAuth } from "../contexts/UserContext"

export const DeckEdit = () => {
    const {user, userLoading} = useAuth()
    
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