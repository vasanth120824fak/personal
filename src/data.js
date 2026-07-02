export const sectionLabels = {
  personalInfo: "Personal Information",
  family: "Family Details",
  contacts: "Contacts",
  education: "Education",
  college: "College Details",
  governmentIds: "Government IDs",
  socialLinks: "Social Media",
  bankAccounts: "Bank Details",
  documents: "Documents",
  career: "Career",
  achievements: "Achievements",
  certificates: "Certificates",
  frequentAnswers: "Frequently Used Answers",
  accounts: "Accounts",
  settings: "Settings",
};

export const createDefaultVault = () => ({
  personalInfo: {
    fullName: "VASANTHARAJ MASIMALAI",
    firstName: "VASANTHARAJ",
    lastName: "MASIMALAI",
    dob: "",
    gender: "Male",
    bloodGroup: "B+",
    nationality: "Indian",
    religion: "",
    maritalStatus: "Single",
  },
  family: [
    {
      id: crypto.randomUUID(),
      relation: "Father",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
    },
    {
      id: crypto.randomUUID(),
      relation: "Mother",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
    },
    {
      id: crypto.randomUUID(),
      relation: "Sister",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
    },
  ],
  contacts: {
    mobile: "",
    alternativeMobile: "",
    email: "",
    collegeEmail: "",
    collegeAddress: "",
    homeAddress: "",
    pincode: "638401",
  },
  education: {
    collegeName: "",
    department: "",
    course: "",
    registerNumber: "",
    rollNumber: "",
    cgpa: "",
    batch: "",
    graduationYear: "",
  },
  college: {
    collegeName: "",
    university: "",
    department: "",
    semester: "",
    hostel: "",
    studentId: "",
  },
  governmentIds: {
    aadhaarNumber: "",
    panNumber: "",
    drivingLicence: "",
    passport: "",
    voterId: "",
  },
  socialLinks: {
    github: "",
    linkedIn: "",
    portfolio: "",
    leetCode: "",
    hackerRank: "",
    codeChef: "",
    codeforces: "",
  },
  bankAccounts: [createBankAccount()],
  documents: [],
  career: {
    currentSkills: "",
    experience: "",
    projects: "",
    internships: "",
    resumeDocumentId: "",
  },
  achievements: [createAchievement()],
  certificates: [createCertificate()],
  frequentAnswers: [createAnswer()],
  accounts: [
    {
      id: crypto.randomUUID(),
      platform: "",
      username: "",
      email: "",
      notes: "",
    },
  ],
  settings: {
    vaultTitle: "Private Personal Vault",
    autoLockMinutes: "30",
    searchHint: "Search mother, aadhaar, resume, college email...",
  },
});

export function createFamilyMember(relation = "Family Member") {
  return {
    id: crypto.randomUUID(),
    relation,
    name: "",
    mobile: "",
    email: "",
    aadhaarNumber: "",
    panNumber: "",
    notes: "",
    bankAccounts: [createBankAccount()],
    documentIds: [],
  };
}

export function createBankAccount() {
  return {
    id: crypto.randomUUID(),
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    micr: "",
    cusId: "",
    branch: "",
  };
}

export function createAchievement() {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
  };
}

export function createCertificate() {
  return {
    id: crypto.randomUUID(),
    name: "",
    issuer: "",
    documentId: "",
  };
}

export function createAnswer() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
  };
}
