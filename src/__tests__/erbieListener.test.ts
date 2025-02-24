import { ethers } from 'ethers';
import listenErbieEvents from '../erbieListener';
import { Transaction } from '../dbService';
import { processBscTransaction } from '../bscProcessor';
import Config from '../config';

jest.mock('ethers');
jest.mock('../bscProcessor');

describe('ErbieChain Event Listener', () => {
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
        ethersModule.parseEther.mockImplementation((value: string) => value);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should listen for TokenLocked events', async () => {
        await listenErbieEvents();

        expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(Config.erbieRPCUrl);
        expect(ethers.Contract).toHaveBeenCalledWith(
            Config.erbieBridgeAddress,
            expect.any(Array),
            mockProvider
        );
        expect(mockContract.on).toHaveBeenCalledWith(
            'TokenLocked',
            expect.any(Function)
        );
    });

    it('should process TokenLocked event and save transaction', async () => {
        await listenErbieEvents();

        // 获取事件处理函数
        const eventHandler = mockContract.on.mock.calls[0][1];

        // 模拟事件数据
        const eventData = {
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: ethers.parseEther('1.0'),
            lockId: 1,
            timestamp: Math.floor(Date.now() / 1000),
            transactionHash: '0xabc'
        };

        // 调用事件处理函数
        await eventHandler(
            eventData.user,
            eventData.tokenAddress,
            eventData.amount,
            eventData.lockId,
            eventData.timestamp,
            { transactionHash: eventData.transactionHash }
        );

        // 验证数据库记录
        const transaction = await Transaction.findByPk(eventData.lockId);
        expect(transaction).not.toBeNull();
        expect(transaction?.user).toBe(eventData.user);
        expect(transaction?.tokenAddress).toBe(eventData.tokenAddress);
        expect(transaction?.amount).toBe(eventData.amount.toString());
        expect(transaction?.erbieTxHash).toBe(eventData.transactionHash);
        expect(transaction?.status).toBe('pending');

        // 验证 BSC 处理函数调用
        expect(processBscTransaction).toHaveBeenCalledWith(
            eventData.user,
            eventData.tokenAddress,
            eventData.amount,
            eventData.lockId,
            eventData.transactionHash
        );
    });

    it('should handle errors during event processing', async () => {
        // 模拟 processBscTransaction 抛出错误
        (processBscTransaction as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

        await listenErbieEvents();
        const eventHandler = mockContract.on.mock.calls[0][1];

        const eventData = {
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: ethers.parseEther('1.0'),
            lockId: 1,
            timestamp: Math.floor(Date.now() / 1000),
            transactionHash: '0xabc'
        };

        await eventHandler(
            eventData.user,
            eventData.tokenAddress,
            eventData.amount,
            eventData.lockId,
            eventData.timestamp,
            { transactionHash: eventData.transactionHash }
        );

        const transaction = await Transaction.findByPk(eventData.lockId);
        expect(transaction?.status).toBe('failed');
        expect(transaction?.error).toBe('Test error');
    });
});