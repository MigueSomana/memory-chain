// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThesisCertification {
    struct Certificate {
        string thesisId;
        string userId;
        string institutionId;
        string ipfsCid;
        string fileHash;
        string hashAlgorithm;
        uint256 issuedAt;
        bool exists;
    }

    // thesisId (Mongo) => certificado
    mapping(string => Certificate) private certificates;

    event Certified(
        string thesisId,
        string userId,
        string institutionId,
        string ipfsCid,
        string fileHash,
        string hashAlgorithm,
        uint256 issuedAt
    );

    function certify(
        string calldata thesisId,
        string calldata userId,
        string calldata institutionId,
        string calldata ipfsCid,
        string calldata fileHash,
        string calldata hashAlgorithm
    ) external {
        require(!certificates[thesisId].exists, "Already certified");

        Certificate memory c = Certificate({
            thesisId: thesisId,
            userId: userId,
            institutionId: institutionId,
            ipfsCid: ipfsCid,
            fileHash: fileHash,
            hashAlgorithm: hashAlgorithm,
            issuedAt: block.timestamp,
            exists: true
        });

        certificates[thesisId] = c;

        emit Certified(
            thesisId,
            userId,
            institutionId,
            ipfsCid,
            fileHash,
            hashAlgorithm,
            block.timestamp
        );
    }

    function getCertificate(string calldata thesisId)
        external
        view
        returns (Certificate memory)
    {
        require(certificates[thesisId].exists, "Not certified");
        return certificates[thesisId];
    }

    function isCertified(string calldata thesisId) external view returns (bool) {
        return certificates[thesisId].exists;
    }
}
