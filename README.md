# Erbie-BSC Relayer

## Overview

The Erbie-BSC Relayer is a cross-chain bridge service that facilitates token transfers between the Erbie Chain and Binance Smart Chain (BSC). It monitors events on the Erbie Chain, processes them, and executes corresponding transactions on BSC.

## Features

- **Event Monitoring**: Listens for `TokenLocked` events on Erbie Chain
- **Cross-Chain Transactions**: Processes transactions on BSC based on Erbie Chain events
- **Transaction Status Tracking**: Monitors and updates the status of cross-chain transactions
- **Automatic Retry Mechanism**: Retries failed transactions up to 3 times
- **Event Acknowledgement**: Listens for `CrossedSuccess` events on BSC to confirm transaction completion

## Architecture

The relayer consists of several key components:

1. **Erbie Chain Listener**: Monitors the Erbie Chain for `TokenLocked` events
2. **BSC Processor**: Executes token minting on BSC when tokens are locked on Erbie Chain
3. **BSC Listener**: Monitors BSC for `CrossedSuccess` events to acknowledge completed transactions
4. **Database Service**: Stores and manages transaction data and status
5. **Retry Mechanism**: Automatically retries failed transactions

## Prerequisites

- Node.js (v14 or higher)
- Yarn package manager
- PostgreSQL database
- Access to Erbie Chain and BSC RPC endpoints
- Private key with sufficient funds for BSC transactions

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/erbie-bsc-relayer.git
   cd erbie-bsc-relayer
   ```

2. Install dependencies:

   ```
   yarn install
   ```

3. Create a `.env` file based on the provided example:

   ```
   cp .env.example .env
   ```

4. Configure your environment variables in the `.env` file:

   ```
   # ErbieChain Configuration
   ERBIE_RPC_URL=https://rpc.erbie.io
   ERBIE_BRIDGE_ADDRESS=0x...

   # BSC Configuration
   BSC_RPC_URL=https://bsc-dataseed.binance.org/
   BSC_LLA_CONTRACT_ADDRESS=0x...
   BSC_PRIVATE_KEY=your_private_key_here

   # Database Configuration
   DATABASE_URL=postgres://username:password@localhost:5432/erbie_bsc_relayer
   ```

5. Compile TypeScript:

   ```
   yarn build
   ```

## Usage

### Running in Default Environment

Start the relayer service with default environment:

```
yarn start
```

### Running in Testnet Environment

Start the relayer service in testnet environment:

```
yarn start:testnet
```

### Running in Mainnet Environment

Start the relayer service in mainnet environment:

```
yarn start:mainnet
```

The service will:

1. Connect to the database and sync the schema
2. Start listening for `TokenLocked` events on Erbie Chain
3. Start listening for `CrossedSuccess` events on BSC
4. Initialize the retry mechanism for failed transactions

## Development

### Running Tests

Run the test suite with:

```
yarn test
```

The tests use an in-memory SQLite database for testing database operations.

### Project Structure

- `src/`
  - `index.ts` - Main entry point
  - `config.ts` - Configuration management
  - `dbService.ts` - Database models and operations
  - `erbieListener.ts` - Erbie Chain event listener
  - `bscProcessor.ts` - BSC transaction processor
  - `bscListener.ts` - BSC event listener
  - `__tests__/` - Test files

## Potential Improvements

1. **Enhanced Error Handling**: Implement more robust error handling and recovery mechanisms
2. **Logging System**: Add a structured logging system for better monitoring and debugging
3. **Metrics Collection**: Implement metrics collection for monitoring service performance
4. **API Endpoints**: Add REST API endpoints for querying transaction status
5. **Admin Dashboard**: Create a web interface for monitoring and managing transactions
6. **Gas Price Management**: Implement dynamic gas price adjustment for BSC transactions
7. **Multi-token Support**: Extend support for multiple token types
8. **Security Enhancements**: Add additional security measures for private key management

## License

MIT
