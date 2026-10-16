export const syncTimeZone = async () => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ timezone: userTimezone })
    })
    const data = await response.json()
    console.log('sync response:', response.status, data)
}