import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment configuration based on NODE_ENV
const envFile = process.env.NODE_ENV === 'testnet'
    ? '.env.testnet'
    : process.env.NODE_ENV === 'mainnet'
        ? '.env.mainnet'
        : '.env';

const envPath = path.resolve(process.cwd(), envFile);

import log from './logService';

// Check if the environment file exists
if (fs.existsSync(envPath)) {
    log.info(`Loading environment from ${envFile}`);
    dotenv.config({ path: envPath });
} else {
    log.info(`Environment file ${envFile} not found, using default .env`);
    dotenv.config();
}


interface ConfigType {
    erbieRPCUrl: string;
    erbieBridgeAddress: string;
    bscRpcUrl: string;
    bscLLAContractAddress: string;
    bscPrivateKey: string;
    databaseUrl: string;
    logLevel: string;
}

const cfg: ConfigType = {
    erbieRPCUrl: process.env.ERBIE_RPC_URL || '',
    erbieBridgeAddress: process.env.ERBIE_BRIDGE_ADDRESS || '',
    bscRpcUrl: process.env.BSC_RPC_URL || '',
    bscLLAContractAddress: process.env.BSC_LLA_CONTRACT_ADDRESS || '',
    bscPrivateKey: process.env.BSC_PRIVATE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    logLevel: process.env.LOG_LEVEL || 'info',
}

export default cfg;