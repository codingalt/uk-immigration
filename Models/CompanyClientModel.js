const mongoose = require("mongoose");
const validator = require("validator");

const companyClientSchema = mongoose.Schema(
  {
    phase1: {
      status: {
        type: String,
        default: "pending",
      },
      doesCompanyHelp: Boolean,
      companyHelpService: String,
      applicationType: String,
      dateTime: Date,
      companyContact: {
        type: String,
      },
      clientContact: {
        type: String,
      },
      fullNameAsPassport: String,
      postalAddress: String,
      birthDate: Date,
      nationality: String,
      passportNumber: String,
    },
    phase2: {
      status: {
        type: String,
        default: "pending",
      },
      isTerms: Boolean,
      isAuthority: Boolean,
      isAllowAccessToFile: Boolean,
      isShareClientDetails: Boolean,
      passport: String,
      dependantPassport: String,
      utilityBill: String,
      brp: String,
      previousVisaVignettes: String,
      refusalLetter: String,
      educationCertificates: String,
      englishLanguageCertificate: String,
      marriageCertificate: String,
      bankStatements: String,
      other: Array,
      otherDocumentNotes: String,
    },
    phase3: {
      status: {
        type: String,
        default: "pending",
      },
      isOnlinePayment: Boolean,
      onlinePaymentEvidence: String,
      doesCompanyHelp: Boolean,
      companyHelpService: String,
      applicationType: String,
      cost: Number,
      paymentEvidence: String,
      isPaid: {
        type: Boolean,
        default: false,
      },
      reason: String,
      dateTime: Date,
    },
    phase4: {
      status: {
        type: String,
        default: "pending",
      },
      isCompleted: {
        type: Number,
        default: 0,
        required: true,
      },
      general: {
        fullName: {
          type: String,
          required: false,
        },
        isKnownByOtherName: {
          type: Boolean,
          required: false,
        },
        previousName: {
          type: String,
        },
        prevNameFrom: {
          type: Date,
        },
        prevNameTo: {
          type: Date,
        },
        countryOfBirth: {
          type: String,
          required: false,
        },
        placeOfBirth: {
          type: String,
          required: false,
        },
        currentNationality: {
          type: String,
          required: false,
        },
        isOtherNationality: {
          type: Boolean,
          required: false,
        },
        otherNationality: {
          type: String,
        },
        nationalityFrom: {
          type: Date,
        },
        nationalityUntill: {
          type: Date,
        },
        currentPassportNumber: {
          type: String,
          required: false,
        },
        passportIssueDate: {
          type: Date,
          required: false,
        },
        passportExpiryDate: {
          type: Date,
          required: false,
        },
        issuingAuthority: {
          type: String,
          required: false,
        },
        passportPlaceOfIssue: {
          type: String,
          required: false,
        },
        isNationalIDCard: {
          type: Boolean,
          required: false,
        },
        idCardNumber: {
          type: String,
        },
        idCardIssueDate: {
          type: Date,
        },
        isBrp: {
          type: Boolean,
          required: false,
        },
        brpNumber: {
          type: String,
        },
        brpIssueDate: {
          type: Date,
        },
        motherName: {
          type: String,
          required: false,
        },
        motherDob: {
          type: Date,
          required: false,
        },
        motherNationality: {
          type: String,
          required: false,
        },
        motherCountry: {
          type: String,
          required: false,
        },
        motherPlaceOfBirth: {
          type: String,
          required: false,
        },
        fatherName: {
          type: String,
          required: false,
        },
        fatherDob: {
          type: Date,
          required: false,
        },
        fatherNationality: {
          type: String,
          required: false,
        },
        fatherCountry: {
          type: String,
          required: false,
        },
        fatherPlaceOfBirth: {
          type: String,
          required: false,
        },
        isUKNINumber: {
          type: Boolean,
          required: false,
        },
        ukNINumber: {
          type: String,
        },
        niNumberIssueDate: {
          type: Date,
        },
        isUKDrivingLicense: {
          type: Boolean,
          required: false,
        },
        ukDrivingLicenseNumber: {
          type: String,
        },
        ukLicenseIssueDate: {
          type: Date,
        },
        email: {
          type: String,
          required: false,
        },
        mobileNumber: {
          type: String,
          required: false,
        },
      },
      accommodation: {
        address1: {
          type: String,
          required: false,
        },
        address2: {
          type: String,
          required: false,
        },
        locationName: {
          type: String,
          required: false,
        },
        locationCode: {
          type: String,
          required: false,
        },
        town: {
          type: String,
          required: false,
        },
        county: {
          type: String,
          required: false,
        },
        postCode: {
          type: String,
          required: false,
        },
        countryPrefix: {
          type: String,
          required: false,
        },
        country: {
          type: String,
          required: false,
        },
        fax: {
          type: String,
        },
        vatRate: {
          type: String,
        },
        moveInDate: {
          type: Date,
          required: false,
        },
        timeLivedAtCurrentAddress: {
          type: String,
          required: false,
        },
        homeType: {
          type: String,
        },
        otherHomeDetails: {
          type: String,
        },
        landLordName: {
          type: String,
        },
        landLordEmail: {
          type: String,
        },
        landLordTelephone: {
          type: String,
        },
        landLordAddress1: {
          type: String,
        },
        landLordAddress2: {
          type: String,
        },
        landLordLocationName: {
          type: String,
        },
        landLordLocationCode: {
          type: String,
        },
        landLordTown: {
          type: String,
        },
        landLordCounty: {
          type: String,
        },
        landLordPostCode: {
          type: String,
        },
        landLordCountryPrefix: {
          type: String,
        },
        landLordCountry: {
          type: String,
        },
        landLordFax: {
          type: Number,
        },
        landLordVatRate: {
          type: Number,
        },
        bedrooms: {
          type: Number,
        },
        otherRooms: {
          type: Number,
        },
        otherWhoLives: {
          type: String,
        },
        ispreviousHome: {
          type: Boolean,
        },
        previousHomeDetails: {
          address1: String,
          address2: String,
          locationName: String,
          locationCode: String,
          town: String,
          county: String,
          postCode: String,
          countryPrefix: String,
          country: String,
          fax: String,
          vatRate: String,
        },
      },
      family: {
        maritalStatus: {
          type: String,
          required: false,
        },
        spouseName: {
          type: String,
        },
        marriageDate: {
          type: Date,
        },
        whereGotMarried: {
          type: String,
        },
        spouseDob: {
          type: Date,
        },
        spouseNationality: {
          type: String,
        },
        spousePassportNumber: {
          type: String,
        },
        whereDidYouMeet: {
          type: String,
        },
        whenDidRelationshipBegan: {
          type: String,
        },
        whenLastSawEachOther: {
          type: Date,
        },
        isLiveTogether: {
          type: Boolean,
          required: false,
        },
        whichDateStartedLivingTogether: {
          type: Date,
        },
        isChildren: {
          type: Boolean,
          required: false,
        },
        numberOfChildren: {
          type: Number,
        },
        childDetails: [
          {
            childName: {
              type: String,
            },
            childGender: {
              type: String,
            },
            childDob: {
              type: Date,
            },
            childNationality: {
              type: String,
            },
            isChildPassport: {
              type: Boolean,
            },
            childPassportNumber: {
              type: String,
            },
            childPassportIssueDate: {
              type: Date,
            },
            childPassportExpiryDate: {
              type: Date,
            },
            isChildVisa: {
              type: Boolean,
            },
            childVisaType: {
              type: String,
            },
            childVisaIssueDate: {
              type: Date,
            },
            childVisaExpiryDate: {
              type: String,
            },
          },
        ],

        isMarriedBefore: {
          type: Boolean,
          required: false,
        },
        exName: {
          type: String,
        },
        exDob: {
          type: Date,
        },
        exNationality: {
          type: String,
        },
        marriageDateWithEx: {
          type: Date,
        },
        divorceDateWithEx: {
          type: Date,
        },
        isCurrentPartnerMarriedBefore: {
          type: Boolean,
          required: false,
        },
        currentPartnerExName: {
          type: String,
        },
        currentPartnerExDob: {
          type: Date,
        },
        currentPartnerExNationality: {
          type: String,
        },
        currentPartnerExMarriageDate: {
          type: Date,
        },
        currentPartnerExDivorceDate: {
          type: Date,
        },
        isFamilyFriendsInHomeCountry: {
          type: Boolean,
          required: false,
        },
        relativeName: {
          type: String,
        },
        relationship: {
          type: String,
        },
      },
      languageProficiency: {
        isDegreeTaughtInEnglish: {
          type: Boolean,
          required: false,
        },
        isPassedAnyEnglishTest: {
          type: Boolean,
          required: false,
        },
        testType: {
          type: String,
        },
      },
      education: {
        qualification: {
          type: String,
          required: false,
        },
        awardingInstitute: {
          type: String,
          required: false,
        },
        grade: {
          type: String,
          required: false,
        },
        courseSubject: {
          type: String,
          required: false,
        },
        courseLength: {
          type: String,
          required: false,
        },
        yearOfAward: {
          type: Number,
          required: false,
        },
        countryOfAward: {
          type: String,
          required: false,
        },
        state: {
          type: String,
          required: false,
        },
      },
      employment: {
        isEmployed: {
          type: Boolean,
          required: false,
        },
        jobStartDate: {
          type: Date,
        },
        employerName: {
          type: String,
        },
        employerTelephone: {
          type: String,
        },
        employerEmail: {
          type: String,
        },
        annualSalary: {
          type: String,
        },
        jobTitle: {
          type: String,
        },
        employerAddress1: {
          type: String,
        },
        employerAddress2: {
          type: String,
        },
        employerLocation: {
          type: String,
        },
        employerLocationCode: {
          type: String,
        },
        employerTown: {
          type: String,
        },
        employerCounty: {
          type: String,
        },
        employerPostCode: {
          type: String,
        },
        employerCountryPrefix: {
          type: String,
        },
        employerCountry: {
          type: String,
        },
        employerFax: {
          type: String,
        },
        employerVatRate: {
          type: String,
        },
        unEmployedReason: {
          type: String,
        },
      },
      maintenance: {
        bankName: {
          type: String,
          required: false,
        },
        isRegisteredFinancialInstitute: {
          type: String,
          required: false,
        },
        countryFundsHeldIn: {
          type: String,
          required: false,
        },
        currencyFundsHeldIn: {
          type: String,
          required: false,
        },
        amountHeld: {
          type: String,
          required: false,
        },
        fundsDateHeldFrom: {
          type: Date,
          required: false,
        },
      },
      travel: {
        areYouCurrentlyInUk: {
          type: Boolean,
          required: false,
        },
        countryVisited: {
          type: String,
        },
        ukLeaveDate: {
          type: Date,
        },
        returnDate: {
          type: Date,
        },
        reasonForVisit: {
          type: String,
        },
        numberOfVisitsToUk: {
          type: Number,
        },
        lastUkVisits: [
          {
            entryDate: Date,
            departureDate: Date,
            reasonForVisit: String,
          },
        ],
        isVisitedUkIllegally: {
          type: Boolean,
        },
        illegalVisitDetail: {
          type: String,
        },
        isStayedBeyondExpiryDateInUk: {
          type: Boolean,
        },
        reasonForStayingExpiryDateInUk: {
          type: String,
        },
        everBeenToUkOrAnyCountry: {
          type: String,
        },
        isBreachedLeaveConditions: {
          type: Boolean,
        },
        reasonForBreachedLeave: {
          type: String,
        },
        isWorkedWithoutPermission: {
          type: Boolean,
        },
        reasonForWorkedWithoutPermission: {
          type: String,
        },
        isReceivedPublicFunds: {
          type: Boolean,
        },
        detailsForPublicFunds: {
          type: String,
        },
        everGivenFalseInfoForApplyingVisa: {
          type: Boolean,
        },
        reasonForFalseInformation: {
          type: String,
        },
        everUsedDeceptionInPrevVisaApplication: {
          type: Boolean,
        },
        reasonForDeception: {
          type: String,
        },
        everBreachedOtherImmigrationLaws: {
          type: Boolean,
        },
        reasonForBreachingImmigrationLaw: {
          type: String,
        },
        everRefusedVisaOrBorderEntry: {
          type: Boolean,
        },
        reasonForRefusedEntry: {
          type: String,
        },
        everRefusedPermissionToStay: {
          type: Boolean,
        },
        reasonForRefusedPermissionToStay: {
          type: String,
        },
        everRefusedAsylum: {
          type: Boolean,
        },
        reasonForRefusedAsylum: {
          type: String,
        },
        everDeported: {
          type: Boolean,
        },
        reasonForDeported: {
          type: String,
        },
        everBannedFromAnyCountry: {
          type: Boolean,
        },
        reasonForBanned: {
          type: String,
        },
      },
      character: {
        everChargedWithCriminalOffence: {
          type: Boolean,
          required: false,
        },
        reasonForCharged: {
          type: String,
        },
        isPendingProsecutions: {
          type: Boolean,
          required: false,
        },
        reasonForPendingProsecutions: {
          type: String,
        },
        isTerroristViews: {
          type: Boolean,
          required: false,
        },
        reasonForTerroristViews: {
          type: String,
        },
        isWorkedForJudiciary: {
          type: Boolean,
          required: false,
        },
        reasonForJudiciaryWork: {
          type: String,
        },
      },
    },
    userId: {
      type: String,
      unique: true,
    },
    companyId: {
      type: String,
      required: true,
    },
    caseId: {
      type: String,
      required: true,
      unique: true,
    },
    applicationStatus: {
      type: String,
      default: "pending",
    },
    phase: {
      type: Number,
      default: 0,
    },
    phaseStatus: {
      type: String,
      default: "pending",
    },
    rejectPhaseReason: {
      type: String,
    },
    requestedPhase: {
      type: Number,
      default: 1,
    },
    phaseSubmittedByClient: {
      type: Number,
      default: 0,
    },
    reRequest: {
      type: Number,
    },
    isInitialRequestAccepted: {
      type: Boolean,
      default: false,
    },
    isCaseWorkerHandling: {
      type: Boolean,
      default: false,
    },
    caseWorkerId: {
      type: String,
    },
    caseWorkerName: {
      type: String,
    },
    report: [
      {
        phase: Number,
        status: String,
        dateTime: Date,
      },
    ],
    service: [
      {
        serviceType: String,
        dateTime: Date,
      },
    ],
    notes: [
      {
        name: String,
        content: String,
        dateTime: Date,
      },
    ],
    finalConfirmation: {
      pdf: String,
      description: String,
      status: String,
    },
  },
  { timestamps: true }
);

const CompanyClientModel = mongoose.model("CompanyClientApplication", companyClientSchema);
module.exports = CompanyClientModel;
