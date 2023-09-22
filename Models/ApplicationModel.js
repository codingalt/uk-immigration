const mongoose = require("mongoose");

const applicationSchema = mongoose.Schema(
  {
    phase1: {
      applicationType: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      contact: {
        type: String,
        required: true,
      },
      birthDate: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      sameResidence: {
        type: Boolean,
        required: true,
      },
      permissionInCountry: {
        type: String,
      },
      speakEnglish: {
        type: Boolean,
        required: true,
      },
      proficiency: {
        type: String,
      },
      otherLanguagesSpeak: {
        type: Array,
        required: true,
      },
      isRefusedVisaEntry: {
        type: Boolean,
        required: true,
      },
      refusedVisaType: {
        type: String,
      },
      refusedVisaDate: {
        type: Date,
      },
      refusedVisaReason: {
        type: String,
      },
      message: {
        type: String,
        required: true,
      },
    },
    phase2: {
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
      doesCompanyHelp: Boolean,
      companyHelpService: String,
      applicationType: String,
      cost: String,
      paymentEvidence: String,
    },
    phase4: {
      general: {
        fullName: {
          type: String,
          required: true,
        },
        isKnownByOtherName: {
          type: Boolean,
          required: true,
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
          required: true,
        },
        placeOfBirth: {
          type: String,
          required: true,
        },
        currentNationality: {
          type: String,
          required: true,
        },
        isOtherNationality: {
          type: Boolean,
          required: true,
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
          required: true,
        },
        passportIssueDate: {
          type: Date,
          required: true,
        },
        passportExpiryDate: {
          type: Date,
          required: true,
        },
        issuingAuthority: {
          type: String,
          required: true,
        },
        passportPlaceOfIssue: {
          type: String,
          required: true,
        },
        isNationalIDCard: {
          type: Boolean,
          required: true,
        },
        idCardNumber: {
          type: String,
        },
        idCardIssueDate: {
          type: Date,
        },
        isBrp: {
          type: Boolean,
          required: true,
        },
        brpNumber: {
          type: String,
        },
        brpIssueDate: {
          type: Date,
        },
        motherName: {
          type: String,
          required: true,
        },
        motherDob: {
          type: Date,
          required: true,
        },
        motherNationality: {
          type: String,
          required: true,
        },
        motherCountry: {
          type: String,
          required: true,
        },
        motherPlaceOfBirth: {
          type: String,
          required: true,
        },
        fatherName: {
          type: String,
          required: true,
        },
        fatherDob: {
          type: Date,
          required: true,
        },
        fatherNationality: {
          type: String,
          required: true,
        },
        fatherCountry: {
          type: String,
          required: true,
        },
        fatherPlaceOfBirth: {
          type: String,
          required: true,
        },
        isUKNINumber: {
          type: Boolean,
          required: true,
        },
        ukNINumber: {
          type: String,
        },
        niNumberIssueDate: {
          type: Date,
        },
        isUKDrivingLicense: {
          type: Boolean,
          required: true,
        },
        ukDrivingLicenseNumber: {
          type: String,
        },
        ukLicenseIssueDate: {
          type: Date,
        },
        email: {
          type: String,
          required: true,
        },
        mobileNumber: {
          type: String,
          required: true,
        },
      },
      accommodation: {
        address1: {
          type: String,
          required: true,
        },
        address2: {
          type: String,
          required: true,
        },
        locationName: {
          type: String,
          required: true,
        },
        locationCode: {
          type: String,
          required: true,
        },
        town: {
          type: String,
          required: true,
        },
        county: {
          type: String,
          required: true,
        },
        postCode: {
          type: String,
          required: true,
        },
        countryPrefix: {
          type: Number,
          required: true,
        },
        country: {
          type: String,
          required: true,
        },
        fax: {
          type: String,
        },
        vatRate: {
          type: String,
        },
        moveInDate: {
          type: Date,
          required: true,
        },
        timeLivedAtCurrentAddress: {
          type: String,
          required: true,
        },
        homeType: {
          type: String,
          required: true,
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
        landLordCounty: {
          type: String,
        },
        landLordPostCode: {
          type: String,
        },
        landLordCountryPrefix: {
          type: Number,
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
        previousHomeDetails: {
          address1: String,
          address2: String,
          locationName: String,
          locationCode: String,
          town: String,
          county: String,
          postCode: String,
          countryPrefix: Number,
          country: String,
          fax: String,
          vatRate: String,
        },
      },
      family: {
        maritalStatus: {
          type: String,
          required: true,
        },
        spouseName: {
          type: String,
        },
        isMarried: {
          type: Boolean,
          required: true,
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
          required: true,
        },
        whichDateStartedLivingTogether: {
          type: Date,
        },
        isChildren: {
          type: Boolean,
          required: true,
        },
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
        childPassportNumber: {
          type: String,
        },
        childPassportIssueDate: {
          type: Date,
        },
        childPassportExpiryDate: {
          type: Date,
        },
        childVisaIssueDate: {
          type: Date,
        },
        childVisaExpiryDate: {
          type: String,
        },
        isMarriedBefore: {
          type: Boolean,
          required: true,
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
          required: true,
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
          required: true,
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
          required: true,
        },
        isPassedAnyEnglishTest: {
          type: Boolean,
          required: true,
        },
        testType: {
          type: String,
        },
      },
      education: {
        qualification: {
          type: String,
          required: true,
        },
        awardingInstitute: {
          type: String,
          required: true,
        },
        grade: {
          type: String,
          required: true,
        },
        courseSubject: {
          type: String,
          required: true,
        },
        courseLength: {
          type: String,
          required: true,
        },
        yearOfAward: {
          type: Number,
          required: true,
        },
        countryOfAward: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
      },
      employment: {
        isEmployed: {
          type: Boolean,
          required: true,
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
          type: Number,
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
          required: true,
        },
        isRegisteredFinancialInstitute: {
          type: String,
          required: true,
        },
        countryFundsHeldIn: {
          type: String,
          required: true,
        },
        currencyFundsHeldIn: {
          type: String,
          required: true,
        },
        amountHeld: {
          type: String,
          required: true,
        },
        fundsDateHeldFrom: {
          type: Date,
          required: true,
        },
      },
      travel: {
        areYouCurrentlyInUk: {
          type: Boolean,
          required: true,
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
          required: true,
        },
        reasonForCharged: {
          type: String,
        },
        isPendingProsecutions: {
          type: Boolean,
          required: true,
        },
        reasonForPendingProsecutions: {
          type: String,
        },
        isTerroristViews: {
          type: Boolean,
          required: true,
        },
        reasonForTerroristViews: {
          type: String,
        },
        isWorkedForJudiciary: {
          type: Boolean,
          required: true,
        },
        reasonForJudiciaryWork: {
          type: String,
        },
      },
    },
    userId: {
      type: String,
      required: true,
    },
    applicationStatus: {
      type: String,
      default: "pending",
    },
    phase: {
      type: Number,
      default: 1,
    },
    phaseStatus: {
      type: String,
      default: "pending",
    },
    requestedPhase: {
      type: Number,
      default: 1,
    },
    phaseSubmittedByClient: {
      type: Number,
      default: 1,
    },
    isInitialRequestAccepted: {
      type: Boolean,
      default: false,
    },
    notes: [
      {
        name: String,
        content: String,
      },
    ],
  },
  { timestamps: true }
);

// Define the indexes
applicationSchema.index(
  { "phase1.name": 1, "phase1.country": 1, "phase1.birthDate": 1 },
  { background: true } 
);
applicationSchema.index({ "phase1.name": 1 }, { background: true });
applicationSchema.index({ "phase1.country": 1 }, { background: true });
applicationSchema.index({ "phase1.birthDate": 1 }, { background: true });

const ApplicationModel = mongoose.model("Application", applicationSchema);
module.exports = ApplicationModel;
