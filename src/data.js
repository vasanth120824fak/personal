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
    fullName: "",
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    nationality: "",
    religion: "",
    maritalStatus: "",
    fieldLabels: {},
    customFields: [],
  },
  family: [
    {
      id: createNumericId(),
      relation: "Father",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
      fieldLabels: {},
      customFields: [],
    },
    {
      id: createNumericId(),
      relation: "Mother",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
      fieldLabels: {},
      customFields: [],
    },
    {
      id: createNumericId(),
      relation: "Sister",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
      fieldLabels: {},
      customFields: [],
    },
    {
      id: createNumericId(),
      relation: "Brother",
      name: "",
      mobile: "",
      email: "",
      aadhaarNumber: "",
      panNumber: "",
      notes: "",
      bankAccounts: [createBankAccount()],
      documentIds: [],
      fieldLabels: {},
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
    pincode: "",
    fieldLabels: {},
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
    fieldLabels: {},
    customFields: [],
  },
  college: {
    collegeName: "",
    university: "",
    department: "",
    semester: "",
    hostel: "",
    studentId: "",
    fieldLabels: {},
    customFields: [],
  },
  governmentIds: {
    aadhaarNumber: "",
    panNumber: "",
    drivingLicence: "",
    passport: "",
    voterId: "",
    fieldLabels: {},
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
    fieldLabels: {},
    customFields: [],
  },
  bankAccounts: [createBankAccount()],
  documents: [],
  certificates: [createCertificate()],
  others: [createOtherSection()],
});

export function createFamilyMember() {
  return {
    id: createNumericId(),
    name: "",
    mobile: "",
    email: "",
    aadhaarNumber: "",
    panNumber: "",
    notes: "",
    bankAccounts: [createBankAccount()],
    documentIds: [],
    fieldLabels: {},
    customFields: [],
  };
}

export function createBankAccount() {
  return {
    id: createNumericId(),
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    micr: "",
    cusId: "",
    branch: "",
    fieldLabels: {},
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
    fieldLabels: {},
    customFields: [],
  };
}

export function createOtherSection() {
  return {
    id: createNumericId(),
    title: "",
    subsections: [createOtherSubsection()],
    documentIds: [],
    fieldLabels: {},
  };
}

export function createOtherSubsection() {
  return {
    id: createNumericId(),
    title: "",
    fields: [createCustomField("Field name", "")],
    documentIds: [],
    fieldLabels: {},
  };
}

export function createCustomField(label = "", value = "") {
  return {
    id: createNumericId(),
    label,
    value,
  };
}
