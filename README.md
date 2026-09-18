# O-Escrow

A decentralized ETH escrow DApp built on Ethereum Sepolia.

O-Escrow allows a buyer to lock ETH inside a smart contract and release or refund the funds through on-chain transactions.

## Features

* 🔐 Create ETH escrow
* 💰 Lock ETH inside a smart contract
* ✅ Buyer can complete an escrow
* ↩️ Buyer can cancel an escrow
* 🦊 MetaMask wallet integration
* ⛓️ Ethereum Sepolia network
* 📊 On-chain escrow data
* 🧪 Smart contract automated tests
* ⚡ React + TypeScript frontend

## How It Works

```text
Buyer
  │
  │ Create Escrow + ETH
  ▼
Smart Contract
  │
  │
  ├── Complete
  │      ↓
  │    Seller
  │
  └── Cancel
         ↓
       Buyer
```

The ETH is held by the smart contract until the buyer completes or cancels the escrow.

## Tech Stack

### Smart Contract

* Solidity
* Ethereum
* OpenZeppelin
* Hardhat

### Frontend

* React
* TypeScript
* ethers.js
* MetaMask
* Vite

### Network

* Ethereum Sepolia Testnet

## Smart Contract

Deployed contract:

`0x70B5b6cbb712ee9A5B803c639f606CD99Eb75619`

Network:

`Ethereum Sepolia`

The contract provides:

```solidity
createEscrow(address seller)
completeEscrow(uint256 escrowId)
cancelEscrow(uint256 escrowId)
```

## Escrow Lifecycle

### 1. Create

The buyer specifies the seller's wallet address and deposits ETH.

```text
Buyer → Smart Contract
```

The contract records:

* Buyer address
* Seller address
* ETH amount
* Escrow status

### 2. Complete

The buyer confirms that the transaction is complete.

```text
Smart Contract → Seller
```

The escrow status changes to `Completed` and the ETH is transferred to the seller.

### 3. Cancel

The buyer can cancel an active escrow.

```text
Smart Contract → Buyer
```

The escrow status changes to `Cancelled` and the ETH is returned to the buyer.

## Security Considerations

The contract uses access control to ensure that only the buyer associated with an escrow can complete or cancel it.

The contract also updates the escrow status before performing the external ETH transfer.

Further security hardening can include:

* Reentrancy protection
* Custom Solidity errors
* Explicit escrow ID validation
* Additional automated security tests

## Testing

The smart contract tests cover the core escrow lifecycle and authorization rules.

Example test scenarios:

```text
✓ Create escrow
✓ Store buyer correctly
✓ Store seller correctly
✓ Store escrow amount
✓ Fund escrow
✓ Complete escrow
✓ Cancel escrow
✓ Only buyer can complete
✓ Only buyer can cancel
✓ Cannot complete an invalid escrow state
✓ Cannot cancel an invalid escrow state
```

## Running Locally

Clone the repository:

```bash
git clone https://github.com/oritercompany-ui/o-escrow.git
cd o-escrow
```

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npx hardhat test
```

Start the frontend:

```bash
npm run dev
```

Then open the local development URL in your browser and connect MetaMask.

## Project Structure

```text
O-Escrow/
│
├── contracts/
│   └── OEscrow.sol
│
├── test/
│   └── OEscrow.ts
│
├── frontend/
│   └── ...
│
├── README.md
├── package.json
└── .gitignore
```

## Disclaimer

O-Escrow is an educational and portfolio project deployed on the Ethereum Sepolia testnet.

Do not use the deployed contract with real funds.

## Author

Built as a Web3 portfolio project focused on:

* Solidity
* Smart Contract Development
* Ethereum
* React
* TypeScript
* Web3 Wallet Integration
