import listenErbieEvents from './erbieListener';
import listenBscEvents from './bscListener';
import { syncDatabase, Transaction } from './dbService';
import { processBscTransaction } from './bscProcessor';
import { Op } from 'sequelize';

async function startRetryMechanism() {
    setInterval(async () => {
        try {
            const pendingTransactions = await Transaction.findAll({
                where: {
                    status: 'failed',
                    retryCount: {
                        [Op.lt]: 3 // Maximum 3 retry attempts
                    },
                    ackStatus: 0 // Only retry unconfirmed transactions
                }
            });

            for (const transaction of pendingTransactions) {
                console.log(`Retrying transaction: lockId=${transaction.lockId}, retry count=${transaction.retryCount}`);

                try {
                    await processBscTransaction(
                        transaction.user,
                        transaction.tokenAddress,
                        transaction.amount,
                        transaction.lockId,
                        transaction.erbieTxHash
                    );

                    // Update retry count
                    await transaction.increment('retryCount');

                } catch (error: any) {
                    console.error(`Retry failed for lockId=${transaction.lockId}: ${error.message}`);
                    await transaction.increment('retryCount');
                }
            }
        } catch (error: any) {
            console.error('Error in retry mechanism:', error.message);
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log("Transaction retry mechanism started...");
}

async function main() {
    try {
        await syncDatabase();

        // start ErbieChain event listener
        await listenErbieEvents();

        // start BSC event listener
        await listenBscEvents();

        // start retry mechanism
        await startRetryMechanism();

    } catch (error) {
        console.error("Failed to start the application:", error);
    }
}

main();