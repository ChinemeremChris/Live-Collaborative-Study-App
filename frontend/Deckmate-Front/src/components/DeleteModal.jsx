import { X } from "lucide-react"
export const DeleteModal = ({ deleteModalOpen, setDeleteModalOpen, deleteDeck }) => {
    return (
        <div className={`${deleteModalOpen ? 'block' : 'hidden'}`}>
            <div className="block fixed z-20 bg-black/40 inset-0" onClick={() => setDeleteModalOpen(false)} />
            <div className="flex flex-col fixed z-30 p-3 lg:p-5 gap-3 md:gap-5 bg-white w-5/6 md:w-1/2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl text-black">
                <div className="flex items-center">
                    <div className="flex justify-center w-5/6">
                        <span className="font-semibold text-lg md:text-xl lg:text-3xl">Confirm Delete</span>
                    </div>
                    <button onClick={() => setDeleteModalOpen(false)} className=" flex justify-end w-1/6">
                        <X className="lg:w-10 lg:h-10" />
                    </button>
                </div>
                <div className="text-base md:text-lg lg:text-2xl text-center">
                    Are you sure you want to delete this deck?
                </div>
                <div className="flex justify-between md:text-lg lg:text-2xl">
                    <button onClick={() => setDeleteModalOpen(false)} className="py-1 md:py-2 lg:py-3 px-2 md:px-8 lg:px-12 border rounded-lg">
                        Cancel
                    </button>
                    <button onClick={deleteDeck} className="py-1 md:py-2 lg:py-3 px-2 md:px-8 lg:px-12 rounded-lg bg-red-600 text-white">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}