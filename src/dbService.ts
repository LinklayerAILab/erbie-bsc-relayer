import { Sequelize, DataTypes, Model } from 'sequelize';
import Config from './config';


const sequelize = new Sequelize(Config.databaseUrl);

interface TransactionAttributes {
    lockId: number;
    user: string;
    tokenAddress: string;
    amount: string;
    erbieTxHash: string;
    bscTxHash: string | null;
    status: 'pending' | 'success' | 'failed';
    error: string | null;
}


class Transaction extends Model<TransactionAttributes> implements TransactionAttributes {
    public lockId!: number;
    public user!: string;
    public tokenAddress!: string;
    public amount!: string;
    public erbieTxHash!: string;
    public bscTxHash!: string | null;
    public status!: 'pending' | 'success' | 'failed';
    public error!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Transaction.init(
    {
        lockId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        user: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tokenAddress: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        erbieTxHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        bscTxHash: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'success', 'failed'),
            defaultValue: 'pending',
            allowNull: false,
        },
        error: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'transactions',
    }
);

async function syncDatabase() {
    await sequelize.sync();
    console.log('Database synced');
}

export { Transaction, syncDatabase };