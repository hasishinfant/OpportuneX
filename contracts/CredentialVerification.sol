// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CredentialVerification
 * @dev Smart contract for issuing and verifying educational credentials on blockchain
 * @notice This contract manages certificates, badges, and achievements for OpportuneX platform
 */
contract CredentialVerification {
    
    // Credential types
    enum CredentialType {
        CERTIFICATE,
        BADGE,
        ACHIEVEMENT,
        PARTICIPATION
    }
    
    // Credential status
    enum CredentialStatus {
        ACTIVE,
        REVOKED,
        EXPIRED
    }
    
    // Credential structure
    struct Credential {
        bytes32 credentialId;
        address recipient;
        address issuer;
        CredentialType credentialType;
        CredentialStatus status;
        string metadataURI; // IPFS hash
        uint256 issuedAt;
        uint256 expiresAt;
        bool transferable;
    }
    
    // Issuer structure
    struct Issuer {
        address issuerAddress;
        string name;
        bool isVerified;
        bool isActive;
        uint256 registeredAt;
    }
    
    // State variables
    address public owner;
    mapping(bytes32 => Credential) public credentials;
    mapping(address => Issuer) public issuers;
    mapping(address => bytes32[]) public recipientCredentials;
    mapping(address => uint256) public issuerCredentialCount;
    
    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed recipient,
        address indexed issuer,
        CredentialType credentialType,
        string metadataURI
    );
    
    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer,
        uint256 revokedAt
    );
    
    event CredentialTransferred(
        bytes32 indexed credentialId,
        address indexed from,
        address indexed to
    );
    
    event IssuerRegistered(
        address indexed issuerAddress,
        string name,
        uint256 registeredAt
    );
    
    event IssuerVerified(
        address indexed issuerAddress,
        uint256 verifiedAt
    );
    
    event IssuerDeactivated(
        address indexed issuerAddress,
        uint256 deactivatedAt
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyVerifiedIssuer() {
        require(issuers[msg.sender].isVerified, "Only verified issuers can issue credentials");
        require(issuers[msg.sender].isActive, "Issuer is not active");
        _;
    }
    
    modifier credentialExists(bytes32 _credentialId) {
        require(credentials[_credentialId].credentialId != bytes32(0), "Credential does not exist");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new issuer
     * @param _issuerAddress Address of the issuer
     * @param _name Name of the issuer organization
     */
    function registerIssuer(address _issuerAddress, string memory _name) external onlyOwner {
        require(_issuerAddress != address(0), "Invalid issuer address");
        require(issuers[_issuerAddress].issuerAddress == address(0), "Issuer already registered");
        
        issuers[_issuerAddress] = Issuer({
            issuerAddress: _issuerAddress,
            name: _name,
            isVerified: false,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        emit IssuerRegistered(_issuerAddress, _name, block.timestamp);
    }
    
    /**
     * @dev Verify an issuer
     * @param _issuerAddress Address of the issuer to verify
     */
    function verifyIssuer(address _issuerAddress) external onlyOwner {
        require(issuers[_issuerAddress].issuerAddress != address(0), "Issuer not registered");
        
        issuers[_issuerAddress].isVerified = true;
        
        emit IssuerVerified(_issuerAddress, block.timestamp);
    }
    
    /**
     * @dev Deactivate an issuer
     * @param _issuerAddress Address of the issuer to deactivate
     */
    function deactivateIssuer(address _issuerAddress) external onlyOwner {
        require(issuers[_issuerAddress].issuerAddress != address(0), "Issuer not registered");
        
        issuers[_issuerAddress].isActive = false;
        
        emit IssuerDeactivated(_issuerAddress, block.timestamp);
    }
    
    /**
     * @dev Issue a new credential
     * @param _recipient Address of the credential recipient
     * @param _credentialType Type of credential
     * @param _metadataURI IPFS URI containing credential metadata
     * @param _expiresAt Expiration timestamp (0 for non-expiring)
     * @param _transferable Whether the credential can be transferred
     * @return credentialId The unique identifier of the issued credential
     */
    function issueCredential(
        address _recipient,
        CredentialType _credentialType,
        string memory _metadataURI,
        uint256 _expiresAt,
        bool _transferable
    ) external onlyVerifiedIssuer returns (bytes32) {
        require(_recipient != address(0), "Invalid recipient address");
        require(bytes(_metadataURI).length > 0, "Metadata URI cannot be empty");
        require(_expiresAt == 0 || _expiresAt > block.timestamp, "Invalid expiration time");
        
        // Generate unique credential ID
        bytes32 credentialId = keccak256(
            abi.encodePacked(
                _recipient,
                msg.sender,
                _credentialType,
                _metadataURI,
                block.timestamp,
                issuerCredentialCount[msg.sender]
            )
        );
        
        // Create credential
        credentials[credentialId] = Credential({
            credentialId: credentialId,
            recipient: _recipient,
            issuer: msg.sender,
            credentialType: _credentialType,
            status: CredentialStatus.ACTIVE,
            metadataURI: _metadataURI,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            transferable: _transferable
        });
        
        // Update mappings
        recipientCredentials[_recipient].push(credentialId);
        issuerCredentialCount[msg.sender]++;
        
        emit CredentialIssued(
            credentialId,
            _recipient,
            msg.sender,
            _credentialType,
            _metadataURI
        );
        
        return credentialId;
    }
    
    /**
     * @dev Revoke a credential
     * @param _credentialId ID of the credential to revoke
     */
    function revokeCredential(bytes32 _credentialId) external credentialExists(_credentialId) {
        Credential storage credential = credentials[_credentialId];
        require(msg.sender == credential.issuer, "Only issuer can revoke credential");
        require(credential.status == CredentialStatus.ACTIVE, "Credential is not active");
        
        credential.status = CredentialStatus.REVOKED;
        
        emit CredentialRevoked(_credentialId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Transfer a credential to another address
     * @param _credentialId ID of the credential to transfer
     * @param _newRecipient Address of the new recipient
     */
    function transferCredential(bytes32 _credentialId, address _newRecipient) 
        external 
        credentialExists(_credentialId) 
    {
        Credential storage credential = credentials[_credentialId];
        require(msg.sender == credential.recipient, "Only recipient can transfer credential");
        require(credential.transferable, "Credential is not transferable");
        require(credential.status == CredentialStatus.ACTIVE, "Credential is not active");
        require(_newRecipient != address(0), "Invalid new recipient address");
        
        address oldRecipient = credential.recipient;
        credential.recipient = _newRecipient;
        
        // Update recipient credentials mapping
        recipientCredentials[_newRecipient].push(_credentialId);
        
        emit CredentialTransferred(_credentialId, oldRecipient, _newRecipient);
    }
    
    /**
     * @dev Verify a credential
     * @param _credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential details
     */
    function verifyCredential(bytes32 _credentialId) 
        external 
        view 
        credentialExists(_credentialId)
        returns (bool isValid, Credential memory credential) 
    {
        credential = credentials[_credentialId];
        
        // Check if credential is active
        if (credential.status != CredentialStatus.ACTIVE) {
            return (false, credential);
        }
        
        // Check if credential has expired
        if (credential.expiresAt != 0 && credential.expiresAt < block.timestamp) {
            return (false, credential);
        }
        
        // Check if issuer is still verified and active
        if (!issuers[credential.issuer].isVerified || !issuers[credential.issuer].isActive) {
            return (false, credential);
        }
        
        return (true, credential);
    }
    
    /**
     * @dev Get all credentials for a recipient
     * @param _recipient Address of the recipient
     * @return Array of credential IDs
     */
    function getRecipientCredentials(address _recipient) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return recipientCredentials[_recipient];
    }
    
    /**
     * @dev Get credential details
     * @param _credentialId ID of the credential
     * @return The credential details
     */
    function getCredential(bytes32 _credentialId) 
        external 
        view 
        credentialExists(_credentialId)
        returns (Credential memory) 
    {
        return credentials[_credentialId];
    }
    
    /**
     * @dev Get issuer details
     * @param _issuerAddress Address of the issuer
     * @return The issuer details
     */
    function getIssuer(address _issuerAddress) 
        external 
        view 
        returns (Issuer memory) 
    {
        return issuers[_issuerAddress];
    }
    
    /**
     * @dev Check if an address is a verified issuer
     * @param _issuerAddress Address to check
     * @return Whether the address is a verified issuer
     */
    function isVerifiedIssuer(address _issuerAddress) 
        external 
        view 
        returns (bool) 
    {
        return issuers[_issuerAddress].isVerified && issuers[_issuerAddress].isActive;
    }
}
