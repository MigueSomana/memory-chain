// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThesisCertification {
    struct Certificate {
        string thesisId;          // Mongo thesis _id
        string[] authorIds;       // Mongo user _id de autores
        string institutionId;     // Mongo institution _id
        string ipfsCid;           // CID IPFS
        string fileHash;          // Hash del PDF (key principal)
        uint256 issuedAt;         // block.timestamp
        bool exists;              // flag
    }

    // ✅ AHORA: fileHash => certificado (1 certificado por archivo)
    mapping(string => Certificate) private certificates;

    event Certified(
        string fileHash,
        string thesisId,
        string[] authorIds,
        string institutionId,
        string ipfsCid,
        uint256 issuedAt
    );

    // ✅ mantenemos funciones, pero trabajan por fileHash
    function certify(
        string calldata fileHash,
        string calldata thesisId,
        string[] calldata authorIds,
        string calldata institutionId,
        string calldata ipfsCid
    ) external {
        require(!certificates[fileHash].exists, "Already certified");
        require(bytes(fileHash).length > 0, "fileHash required");
        require(bytes(thesisId).length > 0, "thesisId required");
        require(bytes(institutionId).length > 0, "institutionId required");
        require(bytes(ipfsCid).length > 0, "ipfsCid required");
        require(authorIds.length > 0, "authorIds required");

        Certificate memory c = Certificate({
            thesisId: thesisId,
            authorIds: authorIds,
            institutionId: institutionId,
            ipfsCid: ipfsCid,
            fileHash: fileHash,
            issuedAt: block.timestamp,
            exists: true
        });

        certificates[fileHash] = c;

        emit Certified(
            fileHash,
            thesisId,
            authorIds,
            institutionId,
            ipfsCid,
            block.timestamp
        );
    }
 
    function getCertificate(string calldata fileHash)
        external
        view
        returns (Certificate memory)
    {
        require(certificates[fileHash].exists, "Not certified");
        return certificates[fileHash];
    }

    function isCertified(string calldata fileHash) external view returns (bool) {
        return certificates[fileHash].exists;
    }
}