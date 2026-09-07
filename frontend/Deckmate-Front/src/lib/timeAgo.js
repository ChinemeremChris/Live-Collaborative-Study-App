export const TimeAgo = (user_date) => {
    const date = new Date(user_date)
    const now = new Date()
    const rtf = new Intl.RelativeTimeFormat("en", {
        numeric: "always"
    })

    const seconds = Math.floor((date - now)/1000)
    if (Math.abs(seconds) < 60){
        return rtf.format(seconds, "second")
    }

    const minutes = Math.floor(seconds/60)
    if (Math.abs(minutes) < 60){
        return rtf.format(minutes, "minute")
    }

    const hours = Math.floor(minutes/60)
    if (Math.abs(hours) < 24){
        return rtf.format(hours, "hour")
    }

    const days = Math.floor(hours/24)
    if (Math.abs(days) < 30){
        return rtf.format(days, "day")
    }

    const months = Math.floor(days/30)
    if (Math.abs(months) < 12){
        return rtf.format(months, "month")
    }

    const years = Math.floor(months/12)
    return rtf.format(years, "year")
}