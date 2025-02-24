import { Transaction, syncDatabase } from '../dbService';
import { Sequelize } from 'sequelize';

describe('Database Service', () => {
    let sequelize: Sequelize;

    beforeAll(async () => {
        // 使用内存数据库进行测试
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: ':memory:',
            logging: false
        });
        await syncDatabase();
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
        }
    });

    beforeEach(async () => {
        await Transaction.destroy({ where: {} });
    });

    it('should create a new transaction', async () => {
        const transactionData = {
            lockId: 1,
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: '1000000000000000000',
            erbieTxHash: '0xabc',
            bscTxHash: null,
            status: 'pending' as 'pending' | 'success' | 'failed',
            error: null,
            retryCount: 0,
            ackStatus: 0
        };

        const transaction = await Transaction.create(transactionData);

        expect(transaction.lockId).toBe(transactionData.lockId);
        expect(transaction.user).toBe(transactionData.user);
        expect(transaction.tokenAddress).toBe(transactionData.tokenAddress);
        expect(transaction.amount).toBe(transactionData.amount);
        expect(transaction.status).toBe('pending');
    });

    it('should update transaction status', async () => {
        const transaction = await Transaction.create({
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

        await Transaction.update({
            status: 'success',
            bscTxHash: '0xdef'
        }, {
            where: { lockId: transaction.lockId }
        });

        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.status).toBe('success');
        expect(updatedTransaction?.bscTxHash).toBe('0xdef');
    });

    it('should increment retry count', async () => {
        const transaction = await Transaction.create({
            lockId: 1,
            user: '0x1234567890abcdef',
            tokenAddress: '0xabcdef1234567890',
            amount: '1000000000000000000',
            erbieTxHash: '0xabc',
            bscTxHash: null,
            status: 'failed',
            error: 'Test error',
            retryCount: 0,
            ackStatus: 0
        });

        await transaction.increment('retryCount');

        const updatedTransaction = await Transaction.findByPk(1);
        expect(updatedTransaction?.retryCount).toBe(1);
    });

    it('should find transactions by status', async () => {
        await Transaction.bulkCreate([
            {
                lockId: 1,
                user: '0x1234567890abcdef',
                tokenAddress: '0xabcdef1234567890',
                amount: '1000000000000000000',
                erbieTxHash: '0xabc',
                status: 'pending',
                retryCount: 0,
                ackStatus: 0
            },
            {
                lockId: 2,
                user: '0x1234567890abcdef',
                tokenAddress: '0xabcdef1234567890',
                amount: '2000000000000000000',
                erbieTxHash: '0xdef',
                status: 'failed',
                retryCount: 0,
                ackStatus: 0
            }
        ]);

        const failedTransactions = await Transaction.findAll({
            where: { status: 'failed' }
        });

        expect(failedTransactions.length).toBe(1);
        expect(failedTransactions[0].lockId).toBe(2);
    });
});