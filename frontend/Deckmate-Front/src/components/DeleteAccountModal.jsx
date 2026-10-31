import { X } from "lucide-react"

export const DeleteAccountModal = ({ deleteModalOpen, setDeleteModalOpen, HandleDeleteBtn, deletePassword, setDeletePassword }) => {
    return (
        <div className={`fixed inset-0 w-screen h-screen z-30 flex justify-center items-center`}>
            <div onClick={() => setDeleteModalOpen(false)} className="absolute inset-0 bg-black/40 z-30" />
            <div className="w-11/12 md:w-4/5 lg:w-3/5 bg-white flex flex-col gap-5 p-3 rounded-lg z-40">
                <div className="flex items-center">
                    <span className="flex flex-1 min-w-0 justify-center font-semibold text-xl md:text-2xl text-gray-600">
                        Delete Your Account
                    </span>
                    <button onClick={() => setDeleteModalOpen(false)} className="hover:cursor-pointer flex shrink-0 min-w-0">
                        <X />
                    </button>
                </div>
                <div className="flex flex-col gap-2 px-4 text-sm md:text-base font-montserrat text-center">
                    <span>
                        Are you sure you want to permanently delete your account?
                    </span>
                    <span>
                        Your decks will no longer be accessible, except the specific due cards of those who created study sessions.
                    </span>
                </div>
                <div className="flex flex-col gap-1 md:px-14">
                    <div className="md:text-lg">
                        Enter password to delete
                    </div>
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="p-2 border-2 border-black rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 focus:shadow-xl" />
                </div>
                <div className="flex justify-between items-center mt-4 text-sm md:px-14">
                    <button onClick={HandleDeleteBtn} className="hover:cursor-pointer bg-red-500 text-white p-2 md:p-2.5 md:text-lg font-semibold rounded-xl">
                        Delete Account
                    </button>
                    <button onClick={() => setDeleteModalOpen(false)} className="hover:cursor-pointer border p-2 md:p-2.5 md:text-lg font-semibold rounded-xl">
                        Cancel Delete
                    </button>
                </div>
            </div>
        </div>
    )
}