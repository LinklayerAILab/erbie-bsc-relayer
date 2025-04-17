import listenErbieEvents from './erbieListener';
import listenBscEvents from './bscListener';
import { syncDatabase, Transaction } from './dbService';
import { processBscTransaction } from './bscProcessor';
import { Op } from 'sequelize';
import log from './logService';

export async function startRetryMechanism(): Promise<NodeJS.Timeout> {
    return setInterval(async () => {
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
                log.info(`Retrying transaction: lockId=${transaction.lockId}, retry count=${transaction.retryCount}`);

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
                    log.error(`Retry failed for lockId=${transaction.lockId}`, error);
                    await transaction.increment('retryCount');
                }
            }
        } catch (error: any) {
            log.error('Error in retry mechanism', error);
        }
    }, 5 * 60 * 1000); // Check every 5 minutes

    log.info("Transaction retry mechanism started...");
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
        log.error("Failed to start the application", error);
    }
}

main();