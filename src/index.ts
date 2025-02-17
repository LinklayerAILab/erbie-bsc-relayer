import listenErbieEvents from './erbieListener';
import { syncDatabase } from './dbService';

async function main() {
    try {
        await syncDatabase();

        // start ErbieChain event listener
        await listenErbieEvents();

    } catch (error) {
        console.error("Failed to start the application:", error);
    }
}

main();