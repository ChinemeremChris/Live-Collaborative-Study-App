import { useState } from "react"

export const ProfileModal = ({ profileValues, modalsOpen, timezones, HandleChangeProfile, setModalsOpen, HandleSubmitProfile }) => {
    const filtered = timezones.filter((tz) => (
        tz.toLowerCase().includes(profileValues?.timezone?.toLowerCase())
    ))
    
    return (
        <div className={`${modalsOpen?.profile === true ? 'translate-y-0' : 'translate-y-full'} font-montserrat bg-white fixed top-0 left-0 z-20 transition-all duration-150 w-screen min-h-screen flex flex-col gap-3 md:gap-6 lg:gap-10 p-4 md:pt-8 md:px-24 lg:px-36`}>
            <div className="font-semibold text-3xl md:text-4xl lg:text-5xl">
                Profile
            </div>
            <div className="flex flex-col flex-1 min-w-0 gap-6">
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg lg:text-xl">
                        First Name
                    </span>
                    <input type="text" className="lg:text-lg p-2 lg:p-2.5 outline-2 outline-white shadow-lg rounded-lg focus:outline-sky-400 focus:ring-2 focus:ring-blue-400 focus:shadow-inner" value={profileValues?.fname} onChange={(e) => HandleChangeProfile(e.target.value, 'fname')} />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg lg:text-xl">
                        Last Name
                    </span>
                    <input type="text" className="lg:text-lg p-2 lg:p-2.5 outline-2 outline-white shadow-lg rounded-lg focus:outline-sky-400 focus:ring-2 focus:ring-blue-400 focus:shadow-inner" value={profileValues?.lname} onChange={(e) => HandleChangeProfile(e.target.value, 'lname')} />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg lg:text-xl">
                        Email
                    </span>
                    {
                        profileValues?.is_oauth_user === true ?
                            <div className="lg:text-lg">
                                {profileValues?.email}
                            </div>
                        :
                            <input type="text" className="lg:text-lg p-2 lg:p-2.5 outline-2 outline-white shadow-lg rounded-lg focus:outline-sky-400 focus:ring-2 focus:ring-blue-400 focus:shadow-inner" value={profileValues?.email} onChange={(e) => HandleChangeProfile(e.target.value, 'email')} />
                    }
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg lg:text-xl">
                        Timezone
                    </span>
                    <div className="relative w-full">
                        <input type="text" className="w-full p-2 outline-2 outline-white shadow-lg rounded-lg focus:outline-sky-400 focus:ring-2 focus:ring-blue-400 focus:shadow-inner" value={profileValues?.timezone} onChange={(e) => HandleChangeProfile(e.target.value, 'timezone')} />
                        <div className="hide-scrollbar lg:text-lg hover:cursor-pointer absolute top-12 lg:top-14 w-full flex flex-col p-3 shadow-lg bg-gray-100 rounded-xl max-h-30 lg:max-h-40 overflow-y-auto overflow-x-hidden text-sm">
                            {
                                filtered.map((tz, index) => (
                                    <div key={index} onClick={(e) => HandleChangeProfile(tz, 'timezone')} className="py-2 hover:cursor-pointer">
                                        {tz}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div className="shrink-0 flex flex-col gap-2 md:gap-3 justify-center items-center z-30 bg-white -mx-4 py-2">
                <button onClick={() => HandleSubmitProfile()} className="hover:cursor-pointer w-3/5 md:w-2/5 bg-emerald-500 text-white font-semibold p-2 md:p-3 rounded-lg md:text-lg">
                    Save Changes
                </button>
                <button onClick={() => setModalsOpen((prev) => ({...prev, profile: false}))} className="hover:cursor-pointer w-3/5 md:w-2/5 text-black font-semibold p-2 md:p-3 rounded-lg border md:text-lg">
                    Discard Changes
                </button>
            </div>
        </div>
    )
}