pragma solidity ^0.4.24;

import "../PayForGas.sol";


contract RepayableMock is PayForGas {

  uint256 public stored;

  constructor(uint maxGas) PayForGas(maxGas) public {

  }

  function storeFree(uint256 value) external isRepayingGas {
    stored = value;
  }

  function storePay(uint256 value) external {
    stored = value;
  }
}
