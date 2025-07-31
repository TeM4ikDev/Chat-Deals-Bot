export class CreateUserDto {
    id: number
    first_name: string
    last_name: string
    is_premium: boolean
    username: string
}

export class UpdateUserDto {
    newName: string
}