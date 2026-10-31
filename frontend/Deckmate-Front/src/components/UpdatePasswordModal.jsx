import { ShieldClose } from "lucide-react"

export const UpdatePasswordModal = ({ modalsOpen, setModalsOpen, passwordChangeObj, HandlePasswordChangeObj, passwordMutate, passwordPending }) => {
    return (
        <div className={`${modalsOpen.password === true ? 'translate-y-0' : 'translate-y-full'} transition-all duration-150 fixed top-0 left-0 font-montserrat bg-white z-30 w-full min-h-screen flex flex-col p-4 md:px-30 lg:px-120 gap-2 justify-center items-center`}>
            <div className="flex w-full justify-center">
                <ShieldClose className="w-15 h-15 lg:w-24 lg:h-24" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-center text-2xl lg:text-4xl font-semibold">
                    Change Your Password
                </span>
                <span className="text-center lg:text-lg">
                    Enter a new password below to change your password
                </span>
            </div>
            <div className="flex flex-col w-full px-3 py-3 gap-3">
                <div className="flex flex-col text-xl">
                    <span>
                        Old Password
                    </span>
                    <input type="password" value={passwordChangeObj?.old} onChange={(e) => HandlePasswordChangeObj('old', e.target.value)} className="border p-2 rounded-sm" />
                </div>
                <div className="flex flex-col text-xl">
                    <span>
                        New Password
                    </span>
                    <input type="password" value={passwordChangeObj?.new} onChange={(e) => HandlePasswordChangeObj('new', e.target.value)} className="border p-2 rounded-sm" />
                </div>
                <div className="flex flex-col text-xl">
                    <span>
                        Confirm Password
                    </span>
                    <input type="password" value={passwordChangeObj?.confirm} onChange={(e) => HandlePasswordChangeObj('confirm', e.target.value)} className="border p-2 rounded-sm" />
                </div>
                <div className="flex flex-col gap-4 py-3">
                    <button type="button" disabled={passwordPending} onClick={() => passwordMutate()} className={`${passwordPending ? 'bg-sky-400 hover:cursor-not-allowed': 'bg-sky-700 hover:cursor-pointer'} text-white p-3 font-semibold rounded-lg text-lg`}>
                        Change Password
                    </button>
                    <button type="button" onClick={() => setModalsOpen((prev) => ({...prev, password: false}))} className={`hover:cursor-pointer bg-white border p-3 font-semibold rounded-lg text-lg`}>
                        Discard Changes
                    </button>
                </div>
            </div>
        </div>
    )
}