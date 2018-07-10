pragma solidity ^0.4.24;
// pragma experimental ABIEncoderV2; // for bytes[]
// pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/ECRecovery.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";

/**
 * @title MultiSig
 * @author SylTi
 * @dev Very simple multisig limiting attack surface for both Ether and Tokens (ERC20)
 * require owners and signatures to be sorted in alphabetical order  (array.sort() in js) before being inputed or will fail.
 */


contract MultiSig {
  using SafeMath for uint256;
  using ECRecovery for bytes32;

  mapping(address => bool) public owners;
  uint256 public nonce;
  uint256 public threshold;

  constructor(uint256 _threshold, address[] _owners) public {
    require(
      _threshold > 0 && _threshold <= _owners.length, 
      "invalid threshold"
    );
    threshold = _threshold;
    nonce = 0;
    address previousOwner = address(0);
    for (uint256 i = 0; i < _owners.length; i++) {
      require(_owners[i] > previousOwner, "invalid order of owners");
      owners[_owners[i]] = true;
    }
  }

  function () external payable {

  }

  /**
   * @dev Function to pay ether
   * @param _to The address that will receive the ethers.
   * @param _amount The amount of ethers to send.
   * @param _data Used to call a function on a contract. Exemple: bytes4(keccak256("someFunc(bool, uint256)")), true, 3)
   * @param _nonce Unique value used to prevent reuse of past signatures 
   * @param _v v value of signatures of the hash
   * @param _r r value of signatures of the hash
   * @param _s s value of signatures of the hash
   * @return A boolean that indicates if the operation was successful.
   */
  function payEther(
    address _to,
    uint256 _amount,
    bytes   _data,
    uint256 _nonce,
    uint8[] _v, bytes32[] _r, bytes32[] _s
  ) public returns (bool)
  {
    require(_nonce == nonce.add(1), "invalid nonce");
    require(_to != address(0), "invalid address");
    require(_amount > 0, "invalid amount");
    verifySignatures(
      keccak256(
        abi.encodePacked(
          address(this), 
          _to, 
          _amount, 
          _data,
          _nonce
        )), 
      _v, _r, _s);
    nonce = nonce.add(1);
    // solium-disable-next-line security/no-call-value
    require(_to.call.value(_amount)(_data), "send failed");
    // _to.transfer(_amount);
    return true;
  }

    /**
   * @dev Function to pay tokens
   * @param _erc20 The address of the ERC20 token
   * @param _to The address that will receive the tokens.
   * @param _amount The amount of tokens to send.
   * @param _data maybe for ERC221?
   * @param _nonce Unique value used to prevent reuse of past signatures 
   * @param _v v value of signatures of the hash
   * @param _r r value of signatures of the hash
   * @param _s s value of signatures of the hash
   * @return A boolean that indicates if the operation was successful.
   */
  function payToken(
    address _erc20,
    address _to,
    uint256 _amount,
    bytes   _data,
    uint256 _nonce,
    uint8[] _v, bytes32[] _r, bytes32[] _s
  ) public returns (bool)
  {
    require(_nonce == nonce.add(1), "invalid nonce");
    require(_to != address(0), "invalid address");
    require(_erc20 != address(0), "invalid address");
    require(_amount > 0, "invalid amount");

    verifySignatures(
      keccak256(
        abi.encodePacked(
          address(this), 
          _erc20,
          _to, 
          _amount, 
          _data,
          _nonce
        )
      ), 
      _v, _r, _s);

    nonce = nonce.add(1);
    ERC20Basic(_erc20).transfer(_to, _amount);
    return true;
  }

  function verifySignatures(
    bytes32 _hash,
    uint8[] _v, bytes32[] _r, bytes32[] _s
  )  public view returns (address) 
  {
    require(_r.length >= threshold, "invalid number of sig");

    address previousOwner = address(0);
    for (uint256 i = 0; i < _r.length; i++) {
      address currentAddress = ecrecover(
        _hash.toEthSignedMessageHash(), 
        _v[i], _r[i], _s[i]
      );
      require(owners[currentAddress], "signature not from owner");
      require(currentAddress > previousOwner, "invalid order of signature");
    }
  }

  // This will be used once truffle support ABIEncoderV2 bytes[] as function arguments

  // /**
  //  * @dev Function to pay ether
  //  * @param _to The address that will receive the ethers.
  //  * @param _amount The amount of ethers to send.
  //  * @param _data Used to call a function on a contract. Exemple: bytes4(keccak256("someFunc(bool, uint256)")), true, 3)
  //  * @param _nonce Unique value used to prevent reuse of past signatures 
  //  * @param _signatures Signatures of the hash
  //  * @return A boolean that indicates if the operation was successful.
  //  */
  // function payEther(
  //   address _to,
  //   uint256 _amount,
  //   bytes   _data,
  //   uint256 _nonce,
  //   bytes[] _signatures 
  // ) public returns (bool)
  // {
  //   require(_nonce == nonce.add(1), "invalid nonce");
  //   require(_to != address(0), "invalid address");
  //   require(_amount > 0, "invalid amount");
  //   verifySignatures(
  //     keccak256(
  //       abi.encodePacked(
  //         address(this), 
  //         _to, 
  //         _amount, 
  //         _data,
  //         _nonce
  //       )), 
  //     _signatures);
  //   nonce = nonce.add(1);
  //   require(_to.call.value(_amount)(_data), "send failed");
  //   // _to.transfer(_amount);
  //   return true;
  // }

  //   /**
  //  * @dev Function to pay tokens
  //  * @param _erc20 The address of the ERC20 token
  //  * @param _to The address that will receive the tokens.
  //  * @param _amount The amount of tokens to send.
  //  * @param _data maybe for ERC221?
  //  * @param _nonce Unique value used to prevent reuse of past signatures 
  //  * @param _signatures Signatures of the hash
  //  * @return A boolean that indicates if the operation was successful.
  //  */
  // function payToken(
  //   address _erc20,
  //   address _to,
  //   uint256 _amount,
  //   bytes   _data,
  //   uint256 _nonce,
  //   bytes[] _signatures 
  // ) public returns (bool)
  // {
  //   require(_nonce == nonce.add(1), "invalid nonce");
  //   require(_to != address(0), "invalid address");
  //   require(_erc20 != address(0), "invalid address");
  //   require(_amount > 0, "invalid amount");

  //   verifySignatures(
  //     keccak256(
  //       abi.encodePacked(
  //         address(this), 
  //         _erc20,
  //         _to, 
  //         _amount, 
  //         _data,
  //         _nonce
  //       )
  //     ), 
  //     _signatures);

  //   nonce = nonce.add(1);
  //   ERC20Basic(_erc20).transfer(_to, _amount);
  //   return true;
  // }

  // function verifySignatures(
  //   bytes32 _hash,
  //   bytes[] _signatures 
  // )  public view returns (address) 
  // {
  //   require(_signatures.length >= threshold);

  //   address previousOwner = address(0);
  //   for (uint256 i = 0; i < _signatures.length; i++) {
  //     address currentAddress = getAddressFromSignature(
  //       _hash,
  //       _signatures[i]
  //     );
  //     require(owners[currentAddress], "signature not from owner");
  //     require(currentAddress > previousOwner, "invalid order of signature");
  //   }
  // }

  // function getAddressFromSignature(
  //   bytes32 _hash,
  //   bytes   _signature 
  // )  public pure returns (address) 
  // {
  //   return _hash.toEthSignedMessageHash().recover(_signature);
  // }


}
