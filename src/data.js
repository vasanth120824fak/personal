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
  certificates: "Certificates",
  others: "Others",
};

let numericSeed = 100;

export function createNumericId() {
  numericSeed += 1;
  return numericSeed;
}

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
  certificates: [createCertificate()],
  others: [createOtherSection()],
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
    id: createNumericId(),
    title: "",
    description: "",
    customFields: [],
  };
}

export function createCertificate() {
  return {
    id: createNumericId(),
    name: "",
    issuer: "",
    documentId: "",
    customFields: [],
  };
}

export function createOtherSection() {
  return {
    id: createNumericId(),
    title: "",
    subsections: [createOtherSubsection()],
  };
}

export function createOtherSubsection() {
  return {
    id: createNumericId(),
    title: "",
    fields: [createCustomField("Field name", "")],
    documentIds: [],
  };
}

export function createCustomField(label = "", value = "") {
  return {
    id: createNumericId(),
    label,
    value,
  };
}
