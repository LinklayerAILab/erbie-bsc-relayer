import * as dotenv from 'dotenv';

dotenv.config();


interface ConfigType {
    erbieRPCUrl: string;
    erbieBridgeAddress: string;
    bscRpcUrl: string;
    bscLLAContractAddress: string;
    bscPrivateKey: string;
    databaseUrl: string;
}

const cfg: ConfigType = {
    erbieRPCUrl: process.env.ERBIE_RPC_URL || '',
    erbieBridgeAddress: process.env.ERBIE_BRIDGE_ADDRESS || '',
    bscRpcUrl: process.env.BSC_RPC_URL || '',
    bscLLAContractAddress: process.env.BSC_LLA_CONTRACT_ADDRESS || '',
    bscPrivateKey: process.env.BSC_PRIVATE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
}

export default cfg;