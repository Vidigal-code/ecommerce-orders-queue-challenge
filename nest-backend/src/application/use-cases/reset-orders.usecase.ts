import { Injectable, Inject } from '@nestjs/common';
import { LogsUseCase } from './logs.usecase';
import * as orderRepository from "../../domain/repositories/order.repository";

@Injectable()
export class ResetOrdersUseCase {
    constructor(
        @Inject('IOrderRepository')
        private readonly orderRepo:  orderRepository.IOrderRepository,
        private readonly logsUseCase: LogsUseCase,
    ) {}

    async execute(): Promise<{ message: string }> {
        await this.orderRepo.reset();
        this.logsUseCase.resetLogs();
        return { message: 'Banco de pedidos resetado com sucesso. Logs apagados.' };
    }
}