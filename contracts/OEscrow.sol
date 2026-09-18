// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OEscrow {
    enum Status {
        Created,
        Funded,
        Completed,
        Cancelled
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        Status status;
    }

    uint256 public escrowCount;

    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );

    event EscrowCompleted(
        uint256 indexed escrowId
    );

    event EscrowCancelled(
        uint256 indexed escrowId
    );

    function createEscrow(address _seller) external payable {
        require(_seller != address(0), "Invalid seller");
        require(msg.value > 0, "Amount must be greater than 0");

        escrowCount++;

        escrows[escrowCount] = Escrow({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            status: Status.Funded
        });

        emit EscrowCreated(
            escrowCount,
            msg.sender,
            _seller,
            msg.value
        );
    }

    function completeEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];

        require(escrow.buyer == msg.sender, "Only buyer can complete");
        require(escrow.status == Status.Funded, "Invalid status");

        escrow.status = Status.Completed;

        (bool success, ) = payable(escrow.seller).call{value: escrow.amount}("");
require(success, "ETH transfer failed");

        emit EscrowCompleted(_escrowId);
    }

    function cancelEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];

        require(escrow.buyer == msg.sender, "Only buyer can cancel");
        require(escrow.status == Status.Funded, "Invalid status");

        escrow.status = Status.Cancelled;

        (bool success, ) = payable(escrow.buyer).call{value: escrow.amount}("");
require(success, "ETH transfer failed");

        emit EscrowCancelled(_escrowId);
    }
}