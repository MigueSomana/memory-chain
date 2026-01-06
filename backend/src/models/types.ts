export enum UserRole {
  STUDENT = "STUDENT",
  INSTITUTION = "INSTITUTION",
}

export enum InstitutionType {
  UNIVERSITY = "UNIVERSITY",
  INSTITUTE = "INSTITUTE",
  COLLEGE = "COLLEGE",
  ACADEMIC = "ACADEMIC",
  OTHER = "OTHER",
}

export enum CertificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export type HashAlgorithm = "sha256" | "sha3" | "keccak256";
