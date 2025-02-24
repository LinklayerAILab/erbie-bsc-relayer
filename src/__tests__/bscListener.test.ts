jest.mock('ethers');

import { ethers } from 'ethers';
import listenBscEvents from '../bscListener';
import { Transaction } from '../dbService';
import Config from '../config';

describe('BSC Event Listener', () => {
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
        // Create test transaction
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

        // Get event handler function
        const eventHandler = mockContract.on.mock.calls[0][1];

        // Call event handler function, simulate success event
        await eventHandler(
            ethers.getBigInt(1),
            true,
            { transactionHash: '0xdef' }
        );

        // Verify transaction status update
        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.ackStatus).toBe(1);
    });

    it('should handle failed CrossedSuccess event', async () => {
        // Create test transaction
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

        // Get event handler function
        const eventHandler = mockContract.on.mock.calls[0][1];

        // Call event handler function, simulate failure event
        await eventHandler(
            ethers.getBigInt(1),
            false,
            { transactionHash: '0xdef' }
        );

        // Verify transaction status update
        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.ackStatus).toBe(2);
    });

    it('should handle non-existent transaction', async () => {
        await listenBscEvents();

        // Get event handler function
        const eventHandler = mockContract.on.mock.calls[0][1];

        // Call event handler function with non-existent lockId
        await eventHandler(
            ethers.getBigInt(999),
            true,
            { transactionHash: '0xdef' }
        );

        // Verify no error was thrown
        const transaction = await Transaction.findByPk(999);
        expect(transaction).toBeNull();
    });
});