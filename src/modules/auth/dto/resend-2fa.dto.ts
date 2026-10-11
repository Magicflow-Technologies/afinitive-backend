import { IsNotEmpty, IsString } from "class-validator";

export class Resend2faDto {
    @IsString()
    @IsNotEmpty({ message: 'El token de desafío es obligatorio.' })
    challengeToken!: string;
}