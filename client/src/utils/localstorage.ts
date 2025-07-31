export function getTokenFromLocalStorage(): string | null {
    const token = localStorage.getItem('token')
    return token
}


export function setTokenToLocalStorage(token: string): void {
    localStorage.setItem('token', token)
}


export function removeTokenFromLocalStorage(): void {
    localStorage.removeItem('token')

}


export function getDataFromLocalStorage<T>(key: string): T | null {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
}

export function setDataToLocalStorage<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data))
}

export function removeDataFromLocalStorage(key: string): void {
    localStorage.removeItem(key)
}