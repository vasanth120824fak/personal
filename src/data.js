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
    customFields: [],
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
      customFields: [],
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
      customFields: [],
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
      customFields: [],
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
    customFields: [],
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
    customFields: [],
  },
  college: {
    collegeName: "",
    university: "",
    department: "",
    semester: "",
    hostel: "",
    studentId: "",
    customFields: [],
  },
  governmentIds: {
    aadhaarNumber: "",
    panNumber: "",
    drivingLicence: "",
    passport: "",
    voterId: "",
    customFields: [],
  },
  socialLinks: {
    github: "",
    linkedIn: "",
    portfolio: "",
    leetCode: "",
    hackerRank: "",
    codeChef: "",
    codeforces: "",
    customFields: [],
  },
  bankAccounts: [createBankAccount()],
  documents: [],
  career: {
    currentSkills: "",
    experience: "",
    projects: "",
    internships: "",
    resumeDocumentId: "",
    customFields: [],
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
      customFields: [],
    },
  ],
  settings: {
    vaultTitle: "Private Personal Vault",
    autoLockMinutes: "30",
    searchHint: "Search mother, aadhaar, resume, college email...",
    customFields: [],
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
    customFields: [],
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
    customFields: [],
  };
}

export function createAchievement() {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    customFields: [],
  };
}

export function createCertificate() {
  return {
    id: crypto.randomUUID(),
    name: "",
    issuer: "",
    documentId: "",
    customFields: [],
  };
}

export function createAnswer() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
    customFields: [],
  };
}

export function createCustomField(label = "", value = "") {
  return {
    id: crypto.randomUUID(),
    label,
    value,
  };
}
