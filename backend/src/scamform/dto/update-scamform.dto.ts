import { ScammerStatus } from "@prisma/client";

export interface IUpdateScamFormDto {
    scammerId: string,
    status: ScammerStatus,
    formId: string | undefined
}