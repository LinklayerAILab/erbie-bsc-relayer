jest.mock('ethers');

import { ethers } from 'ethers';
import listenBscEvents from '../bscListener';
import { Transaction } from '../dbService';
import Config from '../config';

describe('BSC Event Listener', () => {
    let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;
    let mockContract: jest.Mocked<ethers.Contract>;

    beforeEach(() => {
        // 清理数据库
        return Transaction.destroy({ where: {} });
    });

    beforeAll(() => {
        // 模拟 ethers Provider
        mockProvider = {
            on: jest.fn(),
        } as any;

        // 模拟合约
        mockContract = {
            on: jest.fn(),
        } as any;

        // 设置 ethers 模拟实现
        const ethersModule = jest.requireMock('ethers');
        ethersModule.JsonRpcProvider.mockImplementation(() => mockProvider);
        ethersModule.Contract.mockImplementation(() => mockContract);
        ethersModule.getBigInt.mockImplementation((value: string) => value);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should listen for CrossedSuccess events', async () => {
        await listenBscEvents();

        expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(Config.bscRpcUrl);
        expect(ethers.Contract).toHaveBeenCalledWith(
            Config.bscLLAContractAddress,
            expect.any(Array),
            mockProvider
        );
        expect(mockContract.on).toHaveBeenCalledWith(
            'CrossedSuccess',
            expect.any(Function)
        );
    });

    it('should update transaction status on CrossedSuccess event', async () => {
        // 创建测试交易
        await Transaction.create({
            lockId: 1,
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: '1000000000000000000',
            erbieTxHash: '0xabc',
            bscTxHash: null,
            status: 'pending',
            error: null,
            retryCount: 0,
            ackStatus: 0
        });

        await listenBscEvents();

        // 获取事件处理函数
        const eventHandler = mockContract.on.mock.calls[0][1];

        // 调用事件处理函数，模拟成功事件
        await eventHandler(
            ethers.getBigInt(1),
            true,
            { transactionHash: '0xdef' }
        );

        // 验证交易状态更新
        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.ackStatus).toBe(1);
    });

    it('should handle failed CrossedSuccess event', async () => {
        // 创建测试交易
        await Transaction.create({
            lockId: 1,
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: '1000000000000000000',
            erbieTxHash: '0xabc',
            bscTxHash: null,
            status: 'pending',
            error: null,
            retryCount: 0,
            ackStatus: 0
        });

        await listenBscEvents();

        // 获取事件处理函数
        const eventHandler = mockContract.on.mock.calls[0][1];

        // 调用事件处理函数，模拟失败事件
        await eventHandler(
            ethers.getBigInt(1),
            false,
            { transactionHash: '0xdef' }
        );

        // 验证交易状态更新
        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.ackStatus).toBe(2);
    });

    it('should handle non-existent transaction', async () => {
        await listenBscEvents();

        // 获取事件处理函数
        const eventHandler = mockContract.on.mock.calls[0][1];

        // 调用事件处理函数，使用不存在的 lockId
        await eventHandler(
            ethers.getBigInt(999),
            true,
            { transactionHash: '0xdef' }
        );

        // 验证没有抛出错误
        const transaction = await Transaction.findByPk(999);
        expect(transaction).toBeNull();
    });
});