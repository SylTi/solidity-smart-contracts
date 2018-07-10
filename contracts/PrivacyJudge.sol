pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ECRecovery.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title PrivateContractEnforcer
 * @author SylTi
 * @dev This kind of construct allows for a smart contract between two entities to remains private as long as they cooperate with each other. 
 *      Cooperation is incentived by the use of a collateral
 */


contract PrivacyJudge {
  
  using ECRecovery for bytes32;
  using SafeMath for uint256;
  address user1;
  address user2;
  uint amountToMatch;
  //percentage of bet used as collateral. This is necessary to incentivize voluntary release of funds
  uint collateralPercentage = 1; 
  bool finalized;

  event LogContractSettlement(uint balance, address deployedAddress);
  event LogDeposit(address depositer, uint amount);

  modifier isUser() {
    require(msg.sender == user1 || msg.sender == user2);
    _;
  }
  
  function () external payable {
    require(user1 == address(0) || user2 == address(0));
    require(msg.value > 0);
    if (user1 == address(0)) {
      user1 = msg.sender;
      amountToMatch = msg.value;
    } else {
      require(msg.value == amountToMatch);
      require(msg.sender != user1);
      user2 = msg.sender;
      assert(address(this).balance == amountToMatch.mul(2));
    }
    emit LogDeposit(msg.sender, msg.value);
  }

  function executeContract(
    bytes code,
    bytes signature 
  ) public isUser 
  {
    require(!finalized);
    require(isValidSignature(code, signature));
    address deployedAddress;
    //create contract in assembly, and jump if deployment failed: no code at address
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      deployedAddress := create(0, add(code, 0x20), mload(code))
      switch iszero(extcodesize(deployedAddress))
        case 1 { revert(0, 0) } // throw if contract failed to deploy
    }
    emit LogContractSettlement(address(this).balance, deployedAddress);
    assert(
      deployedAddress.call.gas(200000).value(address(this).balance)(bytes4(keccak256("execute()")))
    );
    finalized = true;
  }

  function isValidSignature(
    bytes code,
    bytes signature
  ) public view returns (bool) 
  {
    require(
      msg.sender == user1 || msg.sender == user2,
      "transaction must be send from one of the parties"); 

    bytes32 proof = keccak256(
      abi.encodePacked(
        address(this), 
        code)
      ).toEthSignedMessageHash();

    address signer = proof.recover(signature);
    require(
      signer != msg.sender && (signer == user1 || signer == user2), 
      "you must provide the other party signature");
    
    return (true);
  }

  function releasePayment() public isUser {
    if (msg.sender == user1) {
      assert(
        user2.send(address(this).balance.sub(address(this).balance.mul(collateralPercentage).div(100)))
      );
      assert(user1.send(address(this).balance));
    } else if (msg.sender == user2) {
      assert(
        user1.send(address(this).balance.sub(address(this).balance.mul(collateralPercentage).div(100)))
      );
      assert(user2.send(address(this).balance));
    }
    finalized = true;
  }

  function resetContract() public isUser {
    require(finalized);
    amountToMatch = 0;
    user1 = address(0);
    user2 = address(0);
  }
}