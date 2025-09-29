export enum Tier {
    BRONZE = 'BRONZE',
    PRATA = 'PRATA',
    OURO = 'OURO',
    DIAMANTE = 'DIAMANTE',
}

export enum Priority {
    NORMAL = 'NORMAL',
    VIP = 'VIP',
}

export class Order {
    id?: string;
    cliente?: string;
    valor?: number;
    tier?: Tier;
    observacoes?: string;
    priority?: Priority;
    status?: string;
    createdAt?: Date;
}