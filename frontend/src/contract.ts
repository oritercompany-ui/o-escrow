
export const CONTRACT_ADDRESS =
  "0x70B5b6cbb712ee9A5B803c639f606CD99Eb75619";

export const CONTRACT_ABI = [
  // Create
  "function createEscrow(address _seller) external payable",

  // Counter
  "function escrowCount() external view returns (uint256)",

  // Escrow data
  "function escrows(uint256) external view returns (address buyer, address seller, uint256 amount, uint8 status)",

  // Actions
  "function completeEscrow(uint256 _escrowId) external",

  "function cancelEscrow(uint256 _escrowId) external",

  // Events
  "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)",

  "event EscrowCompleted(uint256 indexed escrowId)",

  "event EscrowCancelled(uint256 indexed escrowId)",
];

