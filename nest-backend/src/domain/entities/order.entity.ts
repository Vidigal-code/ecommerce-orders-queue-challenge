export enum Tier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
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
  runId?: string;
}
