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
        // Clean up database
        return Transaction.destroy({ where: {} });
    });

    beforeAll(() => {
        // Mock ethers Provider
        mockProvider = {
            on: jest.fn(),
        } as any;

        // Mock contract
        mockContract = {
            on: jest.fn(),
        } as any;

        // Set up ethers mock implementation
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

        // Get event handler function
        const eventHandler = mockContract.on.mock.calls[0][1];

        // Mock event data
        const eventData = {
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: ethers.parseEther('1.0'),
            lockId: 1,
            timestamp: Math.floor(Date.now() / 1000),
            transactionHash: '0xabc'
        };

        // Call event handler function
        await eventHandler(
            eventData.user,
            eventData.tokenAddress,
            eventData.amount,
            eventData.lockId,
            eventData.timestamp,
            { transactionHash: eventData.transactionHash }
        );

        // Verify database record
        const transaction = await Transaction.findByPk(eventData.lockId);
        expect(transaction).not.toBeNull();
        expect(transaction?.user).toBe(eventData.user);
        expect(transaction?.tokenAddress).toBe(eventData.tokenAddress);
        expect(transaction?.amount).toBe(eventData.amount.toString());
        expect(transaction?.erbieTxHash).toBe(eventData.transactionHash);
        expect(transaction?.status).toBe('pending');

        // Verify BSC processor function call
        expect(processBscTransaction).toHaveBeenCalledWith(
            eventData.user,
            eventData.tokenAddress,
            eventData.amount,
            eventData.lockId,
            eventData.transactionHash
        );
    });

    it('should handle errors during event processing', async () => {
        // Mock processBscTransaction to throw error
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