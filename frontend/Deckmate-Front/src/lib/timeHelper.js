const pluralize = (value, unit) => {
    return `${value} ${unit}${Math.abs(value) === 1 ? "" : "s"}`
}

export const TimeHelper = (time) => {
    if (time == null || !Number.isFinite(Number(time))) return "0 seconds";
    time = Number(time);

    if (Math.abs(time) < 60) {
        return `${time} s`
    }

    const minutes = Math.floor(time / 60)
    if (Math.abs(minutes) < 60) {
        return `${minutes} min`
    }

    const hours = Math.floor(minutes / 60)
    if (Math.abs(hours) < 24) {
        return `${hours} hr`
    }

    const days = Math.floor(hours / 24)
    if (Math.abs(days) < 30) {
        return `${days} d`
    }

    const months = Math.floor(days / 30)
    if (Math.abs(months) < 12) {
        return `${months} mth`
    }

    const years = Math.floor(months / 12)
    return `${years} y`
}