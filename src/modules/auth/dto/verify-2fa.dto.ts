import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class Verify2FaDto {
    @IsString()
    @IsNotEmpty({ message: 'El token de desafío es obligatorio.' })
    challengeToken!: string;

    @IsString()
    @IsNotEmpty({ message: 'El código de verificación es obligatorio. '})
    @Length(6, 6, { message: 'El código de verificación debe tener exactamente 6 dígitos.' })
    @Matches(/^\d{6}$/, { message: 'El código debe contener únicamente números.' })
    codigo!: string;
}